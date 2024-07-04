const supabase = require("../lib/supabaseAPI");

async function saveBlogToSupabaes(data) {
  const { data: savedData, error } = await supabase.from('blogs').upsert(data, {
    onConflict: ['slug'],
  });

  if (error) {
    console.error('Error saving data to Supabase', error);
  } else {
    console.log('Data saved successfully', savedData);
  }
};

module.exports = { saveBlogToSupabaes };