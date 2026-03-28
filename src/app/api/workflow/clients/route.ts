import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";
import {
  buildWorkflowClientCoverage,
  type WorkflowClient,
  workflowClientColumns,
} from "@/lib/workflow-contract";

export async function GET() {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase.from("clients").select(workflowClientColumns).order("name");

  if (!user.canAdmin) {
    query = query.or("visibility.eq.all,visibility.is.null");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clients = (((data ?? []) as unknown) as WorkflowClient[]).map((client) => ({
    ...client,
    coverage: buildWorkflowClientCoverage(client),
  }));

  return NextResponse.json({
    clients,
    permissions: {
      canAdmin: user.canAdmin,
      canWrite: user.canWrite,
      role: user.role,
    },
  });
}
