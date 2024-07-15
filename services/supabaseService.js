const supabase = require("../lib/supabaseAPI");

async function saveBlogToSupabaes(data) {
  const { data: savedData, error } = await supabase.from('blogs').upsert(data, {
    onConflict: ['slug'],
  });

  if (error) {
    console.error('Error saving data to Supabase', error);
    throw error;
  } else {
    console.log('Data saved successfully', savedData);
  }
};

async function saveLearningToSupabase(data) {
  const { data: savedData, error } = await supabase.from('learnings').upsert(data, {
    onConflict: ['slug'],
  });
  if (error) {
    console.error('Error saving data to Supabase', error);
    throw error;
  } else {
    console.log('Data saved successfully', savedData);
  }
};

async function deleteBlogsFromSupabase(slugs) {
  const { data, error } = await supabase.from('blogs').delete().in('slug', slugs);
  if (error) {
    console.error('Error deleting data from Supabase:', error);
    throw error;
  } else {
    console.log('Data deleted successfully:', data);
  }
};

async function deleteLearningsFromSupabase(slugs) {
  const { data, error } = await supabase.from('learnings').delete().in('slug', slugs);
  if (error) {
    console.error('Error deleting data from Supabase:', error);
    throw error;
  } else {
    console.log('Data deleted successfully:', data);
  }
}

module.exports = { saveBlogToSupabaes, saveLearningToSupabase, deleteBlogsFromSupabase, deleteLearningsFromSupabase };