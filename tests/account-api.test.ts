import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock des modules Supabase
const mockDeletePlannerBoards = vi.fn();
const mockDeleteProfiles = vi.fn();
const mockAdminDeleteUser = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: (table: string) => {
      if (table === "planner_boards") {
        return {
          delete: () => ({
            eq: () => mockDeletePlannerBoards(),
          }),
        };
      }
      if (table === "profiles") {
        return {
          delete: () => ({
            eq: () => mockDeleteProfiles(),
          }),
        };
      }
      return { delete: () => ({ eq: () => Promise.resolve({ error: null }) }) };
    },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: mockAdminDeleteUser,
      },
    },
  })),
}));

import { DELETE } from "@/app/api/account/route";

describe("DELETE /api/account", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("retourne 401 si l'utilisateur n'est pas connecté", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const response = await DELETE();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Connexion requise");
  });

  it("retourne 500 si la suppression des tableaux échoue", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    mockDeletePlannerBoards.mockResolvedValueOnce({ error: new Error("DB Error") });

    const response = await DELETE();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("tableaux");
  });

  it("retourne 500 si la suppression du profil échoue", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    mockDeletePlannerBoards.mockResolvedValueOnce({ error: null });
    mockDeleteProfiles.mockResolvedValueOnce({ error: new Error("Profile error") });

    const response = await DELETE();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("profil");
  });

  it("retourne 500 si la clé de service SUPABASE_SERVICE_ROLE_KEY est manquante sans effectuer de suppression partielle", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });

    const response = await DELETE();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(mockDeletePlannerBoards).not.toHaveBeenCalled();
    expect(mockDeleteProfiles).not.toHaveBeenCalled();
  });

  it("appelle admin.deleteUser et supprime définitivement l'utilisateur", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } }, error: null });
    mockDeletePlannerBoards.mockResolvedValueOnce({ error: null });
    mockDeleteProfiles.mockResolvedValueOnce({ error: null });
    mockAdminDeleteUser.mockResolvedValueOnce({ error: null });
    mockSignOut.mockResolvedValueOnce({ error: null });

    const response = await DELETE();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    expect(mockAdminDeleteUser).toHaveBeenCalledWith("user-123");
    expect(mockSignOut).toHaveBeenCalled();
  });
});
