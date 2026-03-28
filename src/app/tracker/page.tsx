import { redirect } from "next/navigation";

export default function TrackerPage() {
  redirect("/ops/legacy?from=tracker");
}
