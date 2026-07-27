const mongoose = require('mongoose');
const DataStore = require('./models/data.model');

mongoose.connect('mongodb://localhost:27017/actuaya_db')
  .then(async () => {
    const doc = await DataStore.findOne({ key: 'um_menu_items_sa-001' });
    if (doc) {
      console.log('Items:', doc.value.length);
      console.log('Contains ensalada?', doc.value.some(i => i.name.toLowerCase().includes('ensalada')));
    } else {
      console.log('No doc found');
    }
    mongoose.connection.close();
  });
