
ALTER FUNCTION public.woic_graph_neighbors(uuid,uuid,integer,text[],timestamptz,integer) SET search_path = public;
ALTER FUNCTION public.woic_graph_shortest_path(uuid,uuid,uuid,integer) SET search_path = public;
ALTER FUNCTION public.woic_graph_similar(uuid,uuid,text,text[],integer) SET search_path = public;
ALTER FUNCTION public.woic_graph_influence(uuid,text,integer) SET search_path = public;
ALTER FUNCTION public.woic_graph_communities(uuid,text[],integer,integer) SET search_path = public;
ALTER FUNCTION public.woic_graph_risk_propagation(uuid,uuid,integer,numeric) SET search_path = public;
ALTER FUNCTION public.woic_graph_subgraph(uuid,text[],text[],timestamptz,integer) SET search_path = public;
