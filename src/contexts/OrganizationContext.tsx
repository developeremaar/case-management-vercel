import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Membership } from "@/types/database";
import { useAuth } from "./AuthContext";

interface OrganizationContextType {
  currentMembership: Membership | null;
  setCurrentMembership: (m: Membership) => void;
  clearOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentMembership: null,
  setCurrentMembership: () => {},
  clearOrganization: () => {},
});

export const useOrganization = () => useContext(OrganizationContext);

const STORAGE_KEY = "selected_membership_id";
const STORAGE_ORG_KEY = "selected_organization_id";
const STORAGE_ROLE_KEY = "selected_role";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { memberships, session } = useAuth();
  const [currentMembership, setCurrentMembershipState] = useState<Membership | null>(null);

  useEffect(() => {
    if (!session) {
      setCurrentMembershipState(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_ORG_KEY);
      localStorage.removeItem(STORAGE_ROLE_KEY);
      return;
    }

    if (memberships.length === 0) return;

    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = memberships.find((m) => m.id === savedId);
      if (found) {
        setCurrentMembershipState(found);
        return;
      }
    }

    // Auto-select if only one membership
    if (memberships.length === 1) {
      setCurrentMembershipState(memberships[0]);
      localStorage.setItem(STORAGE_KEY, memberships[0].id);
      localStorage.setItem(STORAGE_ORG_KEY, memberships[0].organization_id);
      localStorage.setItem(STORAGE_ROLE_KEY, memberships[0].role_id);
    }
  }, [memberships, session]);

  const setCurrentMembership = (m: Membership) => {
    setCurrentMembershipState(m);
    localStorage.setItem(STORAGE_KEY, m.id);
    localStorage.setItem(STORAGE_ORG_KEY, m.organization_id);
    localStorage.setItem(STORAGE_ROLE_KEY, m.role_id);
  };

  const clearOrganization = () => {
    setCurrentMembershipState(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_ORG_KEY);
    localStorage.removeItem(STORAGE_ROLE_KEY);
  };

  return (
    <OrganizationContext.Provider value={{ currentMembership, setCurrentMembership, clearOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}
