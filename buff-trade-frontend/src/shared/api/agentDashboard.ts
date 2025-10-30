import {
  useQuery,
  UseQueryOptions,
  keepPreviousData,
} from "@tanstack/react-query";
import { jsonFetch, buildQueryString } from "./client";
import {
  AgentDashboardResponse,
  CategoryKey,
  TokenData,
} from "@/app/main-page/types";

type AgentDashboardQueryParams = {
  sort?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
};

const agentDashboardKeys = {
  all: ["agent-dashboard"] as const,
  list: (query: string) => ["agent-dashboard", "list", query] as const,
  trending: ["agent-dashboard", "trending"] as const,
  trendingNew: ["agent-data", "trending"] as const,
  categories: ["agent-dashboard", "categories"] as const,
};

const buildListUrl = (params: AgentDashboardQueryParams) => {
  const query = buildQueryString(params);
  return `/api/agent-dashboard${query}`;
};

const fetchAgentDashboard = async (
  params: AgentDashboardQueryParams
): Promise<AgentDashboardResponse> => {
  return jsonFetch<AgentDashboardResponse>(buildListUrl(params));
};

type UseAgentDashboardOptions = UseQueryOptions<AgentDashboardResponse, Error>;

export const useAgentDashboardQuery = (
  params: AgentDashboardQueryParams,
  options?: UseAgentDashboardOptions
) => {
  const queryString = buildQueryString(params);
  return useQuery<AgentDashboardResponse, Error>({
    queryKey: agentDashboardKeys.list(queryString || "default"),
    queryFn: () => fetchAgentDashboard(params),
    placeholderData: keepPreviousData,
    ...options,
  });
};

const fetchTrendingTokens = async (): Promise<TokenData[]> => {
  const query = buildQueryString({ page: 1, pageSize: 3 });
  const response = await jsonFetch<AgentDashboardResponse>(
    `/api/agent-data/agent-dashboard/trending-tokens${query}`
  );
  return response.results ?? [];
};

export const useTrendingTokensQuery = (
  options?: UseQueryOptions<TokenData[], Error>
) => {
  return useQuery<TokenData[], Error>({
    queryKey: agentDashboardKeys.trending,
    queryFn: fetchTrendingTokens,
    ...options,
  });
};

type TrendingQueryParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  sortOrder?: string;
};

const fetchTrendingData = async (
  params: TrendingQueryParams = {}
): Promise<AgentDashboardResponse> => {
  const query = buildQueryString(params);
  const response = await jsonFetch<AgentDashboardResponse>(
    `/api/agent-data/trending${query}`
  );
  return response;
};

export const useTrendingDataQuery = (
  params: TrendingQueryParams = {},
  options?: UseQueryOptions<AgentDashboardResponse, Error>
) => {
  return useQuery<AgentDashboardResponse, Error>({
    queryKey: [...agentDashboardKeys.trendingNew, params],
    queryFn: () => fetchTrendingData(params),
    ...options,
  });
};

const CATEGORY_SORTS: CategoryKey[] = [
  "totalPnL",
  "nav",
  "txCount",
  "createdAt",
];

type CategoryTokens = Record<CategoryKey, TokenData[]>;

const fetchCategoryTokens = async (): Promise<CategoryTokens> => {
  const results = await Promise.all(
    CATEGORY_SORTS.map((sort) =>
      fetchAgentDashboard({
        sort,
        sortOrder: "desc",
        page: 1,
        pageSize: 5,
      })
    )
  );

  return CATEGORY_SORTS.reduce((acc, sort, index) => {
    acc[sort] = results[index]?.results ?? [];
    return acc;
  }, {} as CategoryTokens);
};

export const useCategoryTokensQuery = (
  options?: UseQueryOptions<CategoryTokens, Error>
) => {
  return useQuery<CategoryTokens, Error>({
    queryKey: agentDashboardKeys.categories,
    queryFn: fetchCategoryTokens,
    ...options,
  });
};
