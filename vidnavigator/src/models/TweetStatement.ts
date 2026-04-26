export type TweetClaimType =
  | 'factual_claim'
  | 'opinion'
  | 'question'
  | 'call_to_action'
  | 'satire'
  | 'news_sharing'
  | 'personal_experience';

export type TweetIntent =
  | 'educate'
  | 'inform'
  | 'analyze'
  | 'persuade'
  | 'entertain'
  | 'inspire'
  | 'challenge';

export type TweetTone =
  | 'serious'
  | 'humorous'
  | 'provocative'
  | 'neutral'
  | 'warm'
  | 'skeptical'
  | 'inspirational';

export type TweetEmotion =
  | 'curiosity'
  | 'urgency'
  | 'outrage'
  | 'fear'
  | 'hope_inspiration'
  | 'confidence_reassurance'
  | 'empathy_warmth'
  | 'awe_wonder';

export type TweetAuthority =
  | 'data_driven'
  | 'expert_led'
  | 'experience_based'
  | 'speculative';

export interface TweetStatementJSON {
  final_statement?: string;
  statement_query?: string;
  detailed_analysis?: string;
  topics?: string[];
  entities?: string[];
  claim_type?: TweetClaimType;
  intent?: TweetIntent;
  tone?: TweetTone;
  emotion?: TweetEmotion;
  authority?: TweetAuthority;
  tweet_text?: string | null;
  tweet_media_summary?: string | null;
  quoted_tweet_text?: string | null;
  quoted_media_summary?: string | null;
}

export class TweetStatement {
  final_statement?: string;
  statement_query?: string;
  detailed_analysis?: string;
  topics?: string[];
  entities?: string[];
  claim_type?: TweetClaimType;
  intent?: TweetIntent;
  tone?: TweetTone;
  emotion?: TweetEmotion;
  authority?: TweetAuthority;
  tweet_text?: string | null;
  tweet_media_summary?: string | null;
  quoted_tweet_text?: string | null;
  quoted_media_summary?: string | null;

  constructor(data: TweetStatementJSON) {
    Object.assign(this, data);
  }

  static fromJSON(json: TweetStatementJSON): TweetStatement {
    return new TweetStatement(json);
  }
}
