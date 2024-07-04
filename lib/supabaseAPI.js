const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');

const supabaseUrl = fs.existsSync(process.env.SUPABASE_URL_FILE) ? fs.readFileSync(process.env.SUPABASE_URL_FILE, 'utf8').trim() : process.env.SUPABASE_URL;
const supabaseRoleKey = fs.existsSync(process.env.SUPABASE_ROLE_KEY_FILE) ? fs.readFileSync(process.env.SUPABASE_ROLE_KEY_FILE, 'utf8').trim() : process.env.SUPABASE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseRoleKey);

module.exports = supabase;