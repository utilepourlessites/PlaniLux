import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockProfileUpdate = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (...args: unknown[]) => {
            mockProfileSelect(...args);
            return {
              eq: () => ({
                maybeSingle: () => mockMaybeSingle(),
              }),
            };
          },
          update: (...args: unknown[]) => {
            mockProfileUpdate(...args);
            return {
              eq: () => ({
                select: () => ({
                  single: () => mockSingle(),
                }),
              }),
            };
          },
        };
      }
      return {};
    },
  })),
}));

import { GET, PATCH } from "@/app/api/profile/route";

describe("/api/profile API endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/profile", () => {
    it("retourne 401 si non authentifié", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("retourne les données de profil de l'utilisateur", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
      });
      mockMaybeSingle.mockResolvedValueOnce({
        data: { display_name: "Luna", workspace_name: "Studio Luna" },
        error: null,
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("Luna");
      expect(data.workspaceName).toBe("Studio Luna");
      expect(data.email).toBe("test@example.com");
    });
  });

  describe("PATCH /api/profile", () => {
    it("rejette les données invalides (trop longues)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });

      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "a".repeat(61) }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("met à jour et retourne le profil modifié", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-1", email: "test@example.com" } },
      });
      mockSingle.mockResolvedValueOnce({
        data: { display_name: "Nouveau Nom", workspace_name: "Nouvel Espace" },
        error: null,
      });

      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Nouveau Nom", workspaceName: "Nouvel Espace" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.displayName).toBe("Nouveau Nom");
      expect(data.workspaceName).toBe("Nouvel Espace");
    });
  });
});
