import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "planner_boards") {
        return {
          select: (...args: unknown[]) => {
            mockSelect(...args);
            return {
              eq: (col: string, val: unknown) => {
                mockEq(col, val);
                return {
                  order: (...oArgs: unknown[]) => mockOrder(...oArgs),
                  maybeSingle: () => mockMaybeSingle(),
                  single: () => mockSingle(),
                };
              },
            };
          },
          insert: (...args: unknown[]) => {
            mockInsert(...args);
            return {
              select: () => ({
                single: () => mockSingle(),
              }),
            };
          },
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return {
              eq: (col1: string, val1: unknown) => {
                mockEq(col1, val1);
                return {
                  eq: (col2: string, val2: unknown) => {
                    mockEq(col2, val2);
                    return {
                      select: () => ({
                        maybeSingle: () => mockMaybeSingle(),
                      }),
                    };
                  },
                };
              },
            };
          },
          delete: () => {
            mockDelete();
            return {
              eq: (col1: string, val1: unknown) => {
                mockEq(col1, val1);
                return {
                  eq: (col2: string, val2: unknown) => {
                    mockEq(col2, val2);
                    return {
                      select: () => ({
                        maybeSingle: () => mockMaybeSingle(),
                      }),
                    };
                  },
                  // pour bulk DELETE /api/boards qui a un seul eq("user_id", user.id)
                  then: (resolve: (v: unknown) => void) => Promise.resolve(mockDelete()).then(resolve),
                };
              },
            };
          },
        };
      }
      return {};
    },
  })),
}));

import { GET, POST, DELETE as bulkDELETE } from "@/app/api/boards/route";
import { PATCH, DELETE as singleDELETE } from "@/app/api/boards/[id]/route";

describe("/api/boards API endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/boards", () => {
    it("retourne 401 si non authentifié", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("retourne la liste des tableaux de l'utilisateur", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-abc" } } });
      const rawBoard = {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Mon tableau",
        kind: "school",
        color: "#c6b8f5",
        events: [],
        favorite: true,
        is_deleted: false,
        created_at: "2026-11-15T00:00:00Z",
        updated_at: "2026-11-15T00:00:00Z",
      };
      mockOrder.mockResolvedValueOnce({ data: [rawBoard], error: null });

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(rawBoard.id);
      expect(data[0].title).toBe("Mon tableau");
    });
  });

  describe("POST /api/boards", () => {
    it("valide les données et crée un nouveau tableau", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-abc" } } });
      const createdRow = {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Nouveau planning",
        kind: "weekly",
        color: "#c6b8f5",
        events: [],
        favorite: false,
        is_deleted: false,
        created_at: "2026-11-15T00:00:00Z",
        updated_at: "2026-11-15T00:00:00Z",
      };
      mockSingle.mockResolvedValueOnce({ data: createdRow, error: null });

      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nouveau planning", kind: "weekly" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.title).toBe("Nouveau planning");
    });

    it("rejette une requête avec un titre invalide", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-abc" } } });
      const req = new Request("http://localhost/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   ", kind: "weekly" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/boards/[id]", () => {
    const validId = "33333333-3333-4333-8333-333333333333";

    it("rejette un ID invalide (non-UUID)", async () => {
      const req = new Request("http://localhost/api/boards/bad-id", {
        method: "PATCH",
        body: JSON.stringify({ title: "Nouveau titre" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "bad-id" }) });
      expect(res.status).toBe(400);
    });

    it("retourne 404 si le tableau n'appartient pas à l'utilisateur", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-abc" } } });
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const req = new Request(`http://localhost/api/boards/${validId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Nouveau titre" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: validId }) });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/boards/[id]", () => {
    const validId = "33333333-3333-4333-8333-333333333333";

    it("supprime définitivement le tableau ciblé", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-abc" } } });
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: validId }, error: null });

      const req = new Request(`http://localhost/api/boards/${validId}`, { method: "DELETE" });
      const res = await singleDELETE(req, { params: Promise.resolve({ id: validId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });
});
