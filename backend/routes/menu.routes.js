const express = require('express');
const router = express.Router();
const DataStore = require('../models/data.model');

// GET /api/menu/:slug
// Fetches the public menu configuration and items for a specific restaurant slug.
router.get('/:slug', async (req, res) => {
  const slug = req.params.slug;
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Slug inválido' });
  }

  try {
    // 1. Find the slug mapping to get the userId
    const slugDoc = await DataStore.findOne({ key: `menu_slug_${slug}` });
    
    if (!slugDoc || !slugDoc.value || !slugDoc.value.userId) {
      return res.status(404).json({ error: 'Menú no encontrado' });
    }

    const userId = slugDoc.value.userId;

    // 2. Fetch all menu related keys for this userId
    const configKey = `um_menu_config_${userId}`;
    const itemsKey = `um_menu_items_${userId}`;
    const catsKey = `um_menu_categories_${userId}`;

    const [configDoc, itemsDoc, catsDoc] = await Promise.all([
      DataStore.findOne({ key: configKey }),
      DataStore.findOne({ key: itemsKey }),
      DataStore.findOne({ key: catsKey })
    ]);

    // 3. Return the data
    return res.json({
      config: configDoc ? configDoc.value : null,
      items: itemsDoc ? itemsDoc.value : [],
      categories: catsDoc ? catsDoc.value : []
    });

  } catch (err) {
    console.error('[Menu API] Error fetching menu for slug', slug, err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
