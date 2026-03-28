import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const query = new URLSearchParams({ taskId: "performance_report" });
  const clientName = Array.isArray(searchParams.client)
    ? searchParams.client[0]
    : searchParams.client;

  if (typeof clientName === "string" && clientName.trim()) {
    query.set("clientName", clientName.trim());
  }

  redirect(`/new?${query.toString()}`);
}
