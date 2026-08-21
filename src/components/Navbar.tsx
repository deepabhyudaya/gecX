import { UserButton } from "./UserButton";
import { currentUser } from "@clerk/nextjs/server";
import { getNavbarAvatarData } from "@/actions/community-profile.actions";
import { GlobalSearch } from "./GlobalSearch";

const Navbar = async () => {
  const user = await currentUser();
  let avatarData: { communityAvatar: string; academicAvatar: string } | null = null;

  if (user) {
    try {
      avatarData = await getNavbarAvatarData();
    } catch (error) {
      console.error("Navbar avatar data error:", error);
    }
  }

  const fallback = user?.imageUrl || "/noAvatar.png";

  return (
    <div className="flex items-center justify-between p-4">
      <GlobalSearch />

      <div className="flex items-center gap-6 justify-end w-full">
        {user && (
          <UserButton
            communityAvatar={avatarData?.communityAvatar || fallback}
            academicAvatar={avatarData?.academicAvatar || fallback}
          />
        )}
      </div>
    </div>
  );
};

export default Navbar;
