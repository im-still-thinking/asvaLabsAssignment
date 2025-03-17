import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const decisionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  agent: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const voteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  vote: { type: String, required: true },
  influence: { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now }
});

const nodeInteractionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  sender: { type: String, required: true },
  receiver: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
  topicId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  changeType: { type: String, required: true },
  changeValue: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'approved', 'rejected'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  messages: [messageSchema],
  decisions: [decisionSchema],
  votes: [voteSchema],
  nodeInteractions: [nodeInteractionSchema],
  finalDecision: {
    approved: { type: Boolean },
    justification: { type: String },
    summary: { type: String },
    timestamp: { type: Date }
  },
  changeRequests: [{
    prompt: { type: String },
    interpretation: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  }],
  metadata: { type: mongoose.Schema.Types.Mixed }
});

// Create indexes for faster lookups
sessionSchema.index({ topicId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ createdAt: 1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session; 