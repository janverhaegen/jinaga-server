import { AuthorizationEngine } from "../authorization/authorization-engine";
import { Feed, Observable } from "../feed/feed";
import { Channel } from "../fork/channel";
import { LoginResponse } from "../http/messages";
import { Keystore } from "../keystore";
import { Query } from "../query/query";
import { Specification } from "../specification/specification";
import { FactEnvelope, FactRecord, FactReference } from "../storage";
import { UserIdentity } from "../user-identity";
import { Authentication } from "./authentication";

export class AuthenticationSession implements Authentication {
    private authorizationEngine: AuthorizationEngine | null;

    constructor(
        private inner: Feed,
        private keystore: Keystore,
        authorizationRules: AuthorizationRules | null,
        private userIdentity: UserIdentity,
        private displayName: string,
        private localDeviceIdentity: UserIdentity
    ) {
        this.authorizationEngine = authorizationRules &&
            new AuthorizationEngine(authorizationRules, inner);
    }

    async close(): Promise<void> {
        await this.inner.close();
        await this.keystore.close();
    }
    
    async login(): Promise<LoginResponse> {
        const userFact = await this.keystore.getOrCreateUserFact(this.userIdentity);
        const signedFacts = await this.keystore.signFacts(this.userIdentity, [userFact]);
        await this.inner.save(signedFacts);
        return {
            userFact,
            profile: {
                displayName: this.displayName
            }
        };
    }

    async local(): Promise<FactRecord> {
        const deviceFact = await this.keystore.getOrCreateDeviceFact(this.localDeviceIdentity);
        const signedFact: FactEnvelope = {
            fact: deviceFact,
            signatures: []
        };
        await this.inner.save([signedFact]);
        return deviceFact;
    }

    from(fact: FactReference, query: Query): Observable {
        return this.inner.from(fact, query);
    }

    async save(envelopes: FactEnvelope[]): Promise<FactEnvelope[]> {
        const userFact = await this.keystore.getUserFact(this.userIdentity);
        const facts = envelopes.map(envelope => envelope.fact);
        const authorizedFacts = await this.authorizationEngine.authorizeFacts(facts, userFact);
        const signedFacts = await this.keystore.signFacts(this.userIdentity, authorizedFacts);
        return await this.inner.save(signedFacts);
    }

    query(start: FactReference, query: Query): Promise<FactReference[][]> {
        return this.inner.query(start, query);
    }

    read(start: FactReference[], specification: Specification): Promise<any[]> {
        return this.inner.read(start, specification);
    }

    whichExist(references: FactReference[]): Promise<FactReference[]> {
        throw new Error("WhichExist method not implemented on AuthenticationSession.");
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    addChannel(fact: FactReference, query: Query): Channel {
        return null;
    }

    removeChannel(channel: Channel): void {
    }
}