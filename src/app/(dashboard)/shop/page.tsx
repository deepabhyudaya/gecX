import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRealShopData } from "@/actions/avatar-shop.actions";
import { getColorShopData } from "@/actions/color-shop.actions";
import WorkingShopClient from "./WorkingShopClient";
import { ColorShopClient } from "./ColorShopClient";
import ServerEmojiSlotShopClient from "./ServerEmojiSlotShopClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, Palette, Server } from "lucide-react";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Shop | gecX",
  description: "Purchase avatars, colors, and customize your profile with gecX tokens.",
};

const ShopPage = async () => {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  try {
    const [avatarData, colorData, balance] = await Promise.all([
      getRealShopData(),
      getColorShopData(),
      prisma.userGecXBalance.findUnique({ where: { userId } }),
    ]);

    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <Tabs defaultValue="avatars" className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-background px-4 pt-4">
            <TabsList className="mb-0">
              <TabsTrigger value="avatars" className="flex items-center gap-2">
                <Smile size={16} />
                Avatars
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette size={16} />
                Colors &amp; Backgrounds
              </TabsTrigger>
              <TabsTrigger value="server-slots" className="flex items-center gap-2">
                <Server size={16} />
                Server Slots
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="avatars" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <WorkingShopClient initialData={avatarData} />
          </TabsContent>

          <TabsContent value="colors" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ColorShopClient initialData={colorData} />
          </TabsContent>

          <TabsContent value="server-slots" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ServerEmojiSlotShopClient initialBalance={balance?.balance || 0} />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error("Shop page error:", error);
    return (
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Shop</h1>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">Unable to load shop data. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
};

export default ShopPage;
