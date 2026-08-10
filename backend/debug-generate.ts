import { TimetableEngine } from './src/services/timetableEngine';

async function run() {
  const engine = new TimetableEngine({ days: [1, 2, 3, 4, 5], variant: 1 });
  const tt = await engine.generate();
  console.log("Timetable ID:", tt?.id);
  
  const entries = (engine as any).generatedEntries;
  const dsPracticalA1 = entries.filter((e: any) => 
    e.assignment.subjectId && 
    e.assignment.type === 'PRACTICAL' && 
    e.day === 1
  );
  
  for (const e of dsPracticalA1) {
    console.log(`Day: ${e.day} | Subject: ${e.assignment.subject.code} | Batch: ${e.assignment.batch.name} | Slot: ${e.slot.index}`);
  }
}
run();
