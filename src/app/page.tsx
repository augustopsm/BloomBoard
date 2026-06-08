import { redirect } from "next/navigation";
import BoardApp from "@/components/BoardApp";
import { getSession } from "@/lib/session";

export default function HomePage() {
  const session = getSession();
  if (!session) redirect("/login");
  return <BoardApp userName={session.userName} userId={session.userId ?? null} />;
}
