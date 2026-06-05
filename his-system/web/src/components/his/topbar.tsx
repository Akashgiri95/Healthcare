"use client";
import { format } from "date-fns";
import { Clock, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function Topbar({ title }: { title: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-12 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {format(time, "dd MMM yyyy, hh:mm:ss aa")}
        </span>
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
          LIVE
        </Badge>
      </div>
    </header>
  );
}
