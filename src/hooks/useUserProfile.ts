import { useEffect, useState } from "react";
import { readUserProfile, writeUserProfile, type UserProfile } from "@/lib/userProfile";

export function useUserProfile(userId?: string | null) {
  const [profile, setProfileState] = useState<UserProfile>(() => readUserProfile(userId));

  useEffect(() => {
    setProfileState(readUserProfile(userId));
  }, [userId]);

  function setProfile(next: UserProfile) {
    setProfileState(next);
    writeUserProfile(next, userId);
  }

  return {
    profile,
    setProfile,
  };
}
