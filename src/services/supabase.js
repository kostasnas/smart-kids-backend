import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Log warning if using placeholder values
if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ Supabase environment variables not found. Using placeholder values.');
  console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// KIDS PROFILES
// ============================================================

export const supabaseService = {
  
  // Get all kids for current user
  async getKids() {
    try {
      const { data, error } = await supabase
        .from('kids_profiles')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Add calculated age
      return (data || []).map(kid => ({
        ...kid,
        age: supabaseService.calculateAge(kid.birthdate),
        shoeSize: kid.shoe_size || '',
        clothingSize: kid.clothing_size || '',
        lastShoeUpdate: kid.last_shoe_update || '',
        lastClothesUpdate: kid.last_clothes_update || '',
        notifyBirthday: kid.notify_birthday !== false,
        notifySize: kid.notify_size !== false,
        notifySchool: kid.notify_school !== false,
        notifySeasonal: kid.notify_seasonal !== false,
        favoriteCharacter: kid.favorite_character || '',
        favoriteSport: kid.favorite_sport || '',
      }));
    } catch (error) {
      console.error('Error fetching kids:', error);
      throw error;
    }
  },

  // Create new kid profile
  async createKid(kidData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('kids_profiles')
        .insert([{
          user_id: user.id,
          name: kidData.name,
          avatar: kidData.avatar,
          gender: kidData.gender,
          birthdate: kidData.birthdate,
          shoe_size: kidData.shoeSize || null,
          clothing_size: kidData.clothingSize || null,
          last_shoe_update: kidData.lastShoeUpdate || null,
          last_clothes_update: kidData.lastClothesUpdate || null,
          notify_birthday: kidData.notifyBirthday !== false,
          notify_size: kidData.notifySize !== false,
          notify_school: kidData.notifySchool !== false,
          notify_seasonal: kidData.notifySeasonal !== false,
          favorite_character: kidData.favoriteCharacter || null,
          favorite_sport: kidData.favoriteSport || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        age: supabaseService.calculateAge(data.birthdate)
      };
    } catch (error) {
      console.error('Error creating kid:', error);
      throw error;
    }
  },

  // Update kid profile
  async updateKid(kidId, updates) {
    try {
      const { data, error } = await supabase
        .from('kids_profiles')
        .update({
          name: updates.name,
          avatar: updates.avatar,
          gender: updates.gender,
          birthdate: updates.birthdate,
          shoe_size: updates.shoeSize || null,
          clothing_size: updates.clothingSize || null,
          last_shoe_update: updates.lastShoeUpdate || null,
          last_clothes_update: updates.lastClothesUpdate || null,
          notify_birthday: updates.notifyBirthday !== false,
          notify_size: updates.notifySize !== false,
          notify_school: updates.notifySchool !== false,
          notify_seasonal: updates.notifySeasonal !== false,
          favorite_character: updates.favoriteCharacter || null,
          favorite_sport: updates.favoriteSport || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', kidId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        age: supabaseService.calculateAge(data.birthdate)
      };
    } catch (error) {
      console.error('Error updating kid:', error);
      throw error;
    }
  },

  // Delete kid profile
  async deleteKid(kidId) {
    try {
      const { error } = await supabase
        .from('kids_profiles')
        .delete()
        .eq('id', kidId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting kid:', error);
      throw error;
    }
  },

  // ============================================================
  // WISHLIST
  // ============================================================

  // Get all wishlist items for current user
  async getWishlist() {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          *,
          kids_profiles (
            name,
            avatar
          )
        `)
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },

  // Add item to wishlist
  async addToWishlist(item) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([{
          user_id: user.id,
          kid_id: item.kidId || null,
          product_id: item.productId || null,
          title: item.title,
          thumbnail: item.thumbnail || null,
          store: item.store || null,
          current_price: item.price || 0,
          original_price: item.price || 0,
          product_link: item.link
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  // Remove item from wishlist
  async removeFromWishlist(itemId) {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Update item price
  async updateItemPrice(itemId, newPrice) {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({ current_price: newPrice })
        .eq('id', itemId);
      
      if (error) throw error;

      // Log price change to history
      await supabaseService.addPriceHistory(itemId, newPrice);
    } catch (error) {
      console.error('Error updating price:', error);
      throw error;
    }
  },

  // ============================================================
  // PRICE HISTORY
  // ============================================================

  // Add price history entry
  async addPriceHistory(itemId, price) {
    try {
      const { error } = await supabase
        .from('price_history')
        .insert([{
          item_id: itemId,
          price: price
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding price history:', error);
      // Don't throw - price history is non-critical
    }
  },

  // Get price history for item
  async getPriceHistory(itemId) {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('item_id', itemId)
        .order('checked_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching price history:', error);
      return [];
    }
  },

  // ============================================================
  // MIGRATION HELPER
  // ============================================================

  // Migrate data from localStorage to Supabase
  async migrateLocalStorage() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in, skipping migration');
        return { kids: 0, wishlist: 0 };
      }

      let migratedKids = 0;
      let migratedWishlist = 0;

      // Migrate kids profiles
      const localKids = localStorage.getItem('smart-kids-list');
      if (localKids) {
        try {
          const kidsArray = JSON.parse(localKids);
          
          // Check if already migrated
          const { data: existingKids } = await supabase
            .from('kids_profiles')
            .select('id');
          
          if (!existingKids || existingKids.length === 0) {
            for (const kid of kidsArray) {
              await supabaseService.createKid({
                name: kid.name,
                avatar: kid.avatar,
                gender: kid.gender,
                birthdate: kid.birthDate || kid.birthdate,
                shoeSize: kid.shoeSize || null,
                clothingSize: kid.clothingSize || null
              });
              migratedKids++;
            }
            console.log(`✅ Migrated ${migratedKids} kids to Supabase`);
          }
        } catch (err) {
          console.error('Error migrating kids:', err);
        }
      }

      // Migrate wishlist items
      const localWishlist = localStorage.getItem('tracked-items');
      if (localWishlist) {
        try {
          const wishlistArray = JSON.parse(localWishlist);
          
          // Check if already migrated
          const { data: existingItems } = await supabase
            .from('wishlist_items')
            .select('id');
          
          if (!existingItems || existingItems.length === 0) {
            for (const item of wishlistArray) {
              await supabaseService.addToWishlist({
                title: item.title,
                thumbnail: item.thumbnail,
                store: item.store,
                price: item.price,
                link: item.link,
                kidId: null // Can't map old kid names to new IDs
              });
              migratedWishlist++;
            }
            console.log(`✅ Migrated ${migratedWishlist} wishlist items to Supabase`);
          }
        } catch (err) {
          console.error('Error migrating wishlist:', err);
        }
      }

      return { kids: migratedKids, wishlist: migratedWishlist };
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  // ============================================================
  // UTILITIES
  // ============================================================

  // Calculate age from birthdate
  calculateAge(birthdate) {
    if (!birthdate) return 5;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};
