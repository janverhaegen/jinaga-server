import {
    Authorization,
    AuthorizationEngine,
    AuthorizationRules,
    FactEnvelope,
    FactRecord,
    FactReference,
    ObservableSource,
    Query,
    Specification,
    UserIdentity,
} from "jinaga";

import { Keystore } from "../keystore";

export class AuthorizationKeystore implements Authorization {
    private authorizationEngine: AuthorizationEngine | null;

    constructor(
        private feed: ObservableSource,
        private keystore: Keystore,
        authorizationRules: AuthorizationRules | null) {

        this.authorizationEngine = authorizationRules &&
            new AuthorizationEngine(authorizationRules, feed);
    }

    async getOrCreateUserFact(userIdentity: UserIdentity) {
        const userFact = await this.keystore.getOrCreateUserFact(userIdentity);
        const envelopes = [
            <FactEnvelope>{
                fact: userFact,
                signatures: []
            }
        ];
        await this.feed.save(envelopes);
        return userFact;
    }

    query(userIdentity: UserIdentity, start: FactReference, query: Query) {
        return this.feed.query(start, query);
    }

    read(userIdentity: UserIdentity, start: FactReference[], specification: Specification) {
        return this.feed.read(start, specification);
    }

    load(userIdentity: UserIdentity, references: FactReference[]) {
        return this.feed.load(references);
    }

    async save(userIdentity: UserIdentity, facts: FactRecord[]) {
        if (!this.authorizationEngine) {
            const envelopes = await this.feed.save(facts.map(fact => ({
                fact,
                signatures: []
            })));
            return envelopes.map(envelope => envelope.fact);
        }

        const userFact = await this.keystore.getUserFact(userIdentity);
        const authorizedFacts = await this.authorizationEngine.authorizeFacts(facts, userFact);
        const signedFacts = await this.keystore.signFacts(userIdentity, authorizedFacts);
        const envelopes = await this.feed.save(signedFacts);
        return envelopes.map(envelope => envelope.fact);
    }
}
