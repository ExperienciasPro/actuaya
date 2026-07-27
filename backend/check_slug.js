const mongoose = require('mongoose');
require('dotenv').config();
const DataStore = require('./models/data.model');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/actuaya').then(async () => {
    const keys = await DataStore.find({ key: /menu_slug/ });
    console.log(JSON.stringify(keys, null, 2));
    process.exit();
});
