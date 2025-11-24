import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { documents } from "../lib/db/schema";
import dotenv from "dotenv";

dotenv.config();

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function checkKnowledge() {
  try {
    // Get all unique URLs in knowledge base
    const results = await db
      .select({ url: documents.url })
      .from(documents)
      .groupBy(documents.url)
      .orderBy(documents.url);

    console.log(`\n📊 Found ${results.length} unique URLs in knowledge base:\n`);
    
    // Group by type
    const homepage = results.filter(r => r.url === 'https://www.nyenglishteacher.com/' || r.url === 'https://www.nyenglishteacher.com/en/');
    const about = results.filter(r => r.url?.includes('/about'));
    const services = results.filter(r => r.url?.includes('/services') || r.url?.includes('/servicios'));
    const blog = results.filter(r => r.url?.includes('/blog'));
    const testimonials = results.filter(r => r.url?.includes('/testimonial'));
    
    console.log(`✅ Homepage: ${homepage.length}`);
    homepage.forEach(r => console.log(`   - ${r.url}`));
    
    console.log(`\n✅ About pages: ${about.length}`);
    about.forEach(r => console.log(`   - ${r.url}`));
    
    console.log(`\n✅ Service pages: ${services.length}`);
    services.forEach(r => console.log(`   - ${r.url}`));
    
    console.log(`\n✅ Blog posts: ${blog.length}`);
    
    console.log(`\n✅ Testimonials: ${testimonials.length}`);
    
    console.log(`\n📝 All URLs:`);
    results.forEach(r => console.log(`   ${r.url}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkKnowledge();
