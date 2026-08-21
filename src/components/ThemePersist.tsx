"use client";

import { useEffect } from "react";

interface Props {

  vars: Record<string, string>;

  bodyBgImage?: string;

  mode: "light" | "dark";

  hasTheme: boolean;
}

export function ThemePersist({ vars, bodyBgImage, mode, hasTheme }: Props) {
  useEffect(() => {
    try {
      if (!hasTheme) {
        localStorage.removeItem("gecx_equipped_theme");
        return;
      }
      const payload = {
        vars: bodyBgImage ? { ...vars, backgroundImage: bodyBgImage } : vars,
        mode,
      };
      localStorage.setItem("gecx_equipped_theme", JSON.stringify(payload));
    } catch {

    }

  }, []);

  return null;
}
