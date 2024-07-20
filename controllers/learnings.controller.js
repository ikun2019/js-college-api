const supabase = require('../lib/supabaseAPI');
const { fetchLearningData } = require('../services/notionService');

// * メタデータ取得メソッド
const getPageMetadata = (learning, type) => {
  if (type === 'parent') {
    return {
      title: learning.title,
      description: learning.description,
      image_name: learning.image_name,
      image_url: learning.image_url,
      slug: learning.slug,
      tags: learning.tags ? learning.tags.split(',') : [],
      content: learning.content,
      premium: learning.premium,
    }
  } else {
    return {
      title: learning.title,
      description: learning.description,
      slug: learning.slug,
      premium: learning.premium,
    }
  }
}

// * ネストしたメタデータの取得メソッド
const getNestedMetaData = (nestedPages) => {
  const nestedMetadatas = nestedPages.map((nestedPage) => {
    return {
      title: nestedPage.title,
      description: nestedPage.description,
      slug: nestedPage.slug,
      premium: nestedPage.premium,
    }
  });
  return nestedMetadatas;
};

// @GET /api/learnings
exports.getAllLearnings = async (req, res) => {
  console.log('@GET /api/learnings getAllLearnings');
  try {
    const response = await supabase.from('learnings').select('*');
    const learningsMetadatas = response.data.map((learning) => {
      const metadata = getPageMetadata(learning, 'parent');
      return metadata;
    })
    res.status(200).json({
      metadatas: learningsMetadatas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/learnings/:slug
exports.getSingleLearning = async (req, res) => {
  console.log('@GET /api/learnings/:slug getSingleLearning');
  try {
    const { slug } = req.params;
    const response = await supabase.from('learnings').select('*').eq('slug', slug).single();
    if (!response.data) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const page = response.data;
    const metadata = getPageMetadata(page, 'parent');
    const nestedMetadatas = getNestedMetaData(page.nestedPages[0]);

    res.status(200).json({
      metadata: metadata,
      nestedMetadatas: nestedMetadatas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @ GET /api/learnings/:slug/:childSlug
exports.getSingleLearningPage = async (req, res) => {
  console.log('@ GET /api/learnings/:slug/:childSlug getSingleLearningPage');
  try {
    const { slug, childSlug } = req.params;
    // 親ページのクエリ
    const parentResponse = await supabase.from('learnings').select('nestedPages').eq('slug', slug).single();

    if (!parentResponse.data) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const childPages = parentResponse.data.nestedPages[0];
    const childPage = childPages.find((childPage) => childPage.slug === childSlug);

    const metadata = getPageMetadata(childPage, 'child');
    const markdown = childPage.content;

    // 見出しタグの取得のための動的インポート
    const { unified } = await import('unified');
    const remarkParse = (await import('remark-parse')).default;
    const { visit } = await import('unist-util-visit');

    const headings = [];
    const processor = unified()
      .use(remarkParse)
      .use(() => (tree) => {
        visit(tree, 'heading', (node) => {
          const text = node.children.map((child) => (child.value ? child.value : '')).join('');
          headings.push({ level: node.depth, text });
        });
      });

    const parsedTree = processor.parse(markdown);
    processor.runSync(parsedTree);

    res.status(200).json({
      metadata: metadata,
      markdown: markdown,
      headings: headings,
    }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/learnings/get-new-image-url
exports.getNewImageUrl = async (req, res) => {
  try {
    const learnings = await fetchLearningData(); // notionからlearningsデータを取得
    const newImageUrl = learnings[0]?.image_url;
    if (!newImageUrl) {
      return res.status(404).json({ error: 'Image url not found.' });
    }
    console.log('newImageUrl =>', newImageUrl);
    res.json({ newImageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed fetch image url!' });
  }
};