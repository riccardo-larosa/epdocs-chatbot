
import { testMongoDBConnection } from '@/utils/mongoDbTest';


export default function TestConnection() {
    testMongoDBConnection();
    console.log(`Test Connection`);
    return <div>Test Connection</div>;
}