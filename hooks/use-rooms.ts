"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createRoom, getRoomForJoin, listRooms, type DashboardRoom } from "@/lib/services/rooms";

export function useRooms() {
  const supabase = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<DashboardRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      setRooms(await listRooms(supabase));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshRooms();

    const channel = supabase
      .channel("dashboard:rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => {
          void refreshRooms();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshRooms, supabase]);

  return {
    rooms,
    isLoading,
    createRoom: (input: { name: string; language: string }) => createRoom(supabase, input),
    getRoomForJoin: (roomId: string) => getRoomForJoin(supabase, roomId),
    refreshRooms
  };
}
