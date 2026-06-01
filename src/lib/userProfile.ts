export interface UserProfile {
  firstName: string;
  phoneNumber: string;
}

const DEFAULT_PROFILE: UserProfile = {
  firstName: "",
  phoneNumber: "",
};

function profileKey(userId?: string | null): string {
  return userId ? `streex_user_profile_v1_${userId}` : "streex_user_profile_v1";
}

export function readUserProfile(userId?: string | null): UserProfile {
  try {
    const raw = localStorage.getItem(profileKey(userId));
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      phoneNumber: typeof parsed.phoneNumber === "string" ? parsed.phoneNumber : "",
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function writeUserProfile(profile: UserProfile, userId?: string | null) {
  try {
    localStorage.setItem(profileKey(userId), JSON.stringify({
      firstName: profile.firstName.trim(),
      phoneNumber: profile.phoneNumber.trim(),
    }));
  } catch {
    // Local optional profile only.
  }
}

export function profileCompleteness(profile: UserProfile): number {
  return [profile.firstName, profile.phoneNumber].filter((value) => value.trim().length > 0).length;
}
