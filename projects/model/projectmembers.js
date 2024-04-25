var mongoose = require('mongoose');  
var projectMembersSchema = new mongoose.Schema({  
  ime_korisnika: {
    type: String,
    required: true
  },
  id_projekta: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project'
  }
});
mongoose.model('ProjectMembers', projectMembersSchema);