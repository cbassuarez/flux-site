import { handleChangelogRequest } from "../../src/server/changelog";

type PagesEnv = Record<string, string | undefined>;

type PagesContext = {
  request: Request;
  env: PagesEnv;
};

export async function onRequest({ request, env }: PagesContext) {
  const response = await handleChangelogRequest(new URL(request.url), env);
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
