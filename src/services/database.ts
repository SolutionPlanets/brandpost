import { SupabaseClient } from '@supabase/supabase-js';

export const postService = {
  async getRecentPosts(supabase: SupabaseClient, workspaceId: string, limit = 5) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getUsageStats(supabase: SupabaseClient, workspaceId: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('posts_used_this_cycle, plan_id')
      .eq('id', workspaceId)
      .single();

    if (error) throw error;
    return data;
  },

  async createPost(supabase: SupabaseClient, postData: any) {
    const { data, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const brandService = {
  async getBrandKits(supabase: SupabaseClient, workspaceId: string) {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data;
  }
};
