import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspacePage(props: PageProps) {
  const params = await props.params;
  const query = new URLSearchParams({ clientId: params.id });
  redirect(`/clients?${query.toString()}`);
}
