import { redirect } from "next/navigation";

export default function HubPage() {
  redirect("/ops/legacy?from=hub");
}
