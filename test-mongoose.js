const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  letterTemplates: {
    offerLetter: {
      type: mongoose.Schema.Types.Mixed,
      default: { page1: 'a', page2: 'b', page3: 'c' }
    }
  }
}, { strict: true });
const Model = mongoose.model('TestModel', schema);
async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/niventra_crm');
  await Model.deleteMany({});
  let m = new Model({});
  await m.save();
  const updated = await Model.findOneAndUpdate({}, { $set: { letterTemplates: { offerLetter: { page1: 'x', page4: 'y' } } } }, { new: true });
  console.log(updated.letterTemplates.offerLetter);
  process.exit(0);
}
run();
