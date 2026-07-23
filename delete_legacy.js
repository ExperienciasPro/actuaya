const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/actuaya_db')
  .then(async () => {
    const DataStore = require('./models/data.model.js');
    const keysToDelete = ["um_deals", "um_catalog", "um_tasks", "um_goals", "um_funnels", "um_technicians_v1"];
    const result = await DataStore.deleteMany({ key: { $in: keysToDelete } });
    console.log('Deleted legacy keys:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
