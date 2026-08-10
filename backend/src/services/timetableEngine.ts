import { PrismaClient, FacultyAssignment, TimeSlot, Room } from '@prisma/client';

const prisma = new PrismaClient();

interface EngineConfig {
  days: number[]; // e.g., 1 to 5 (Mon-Fri)
  variantsToGenerate: number; // 1, 3, or 5
  scope?: {
    divisionIds: string[];
    batchIds: string[];
  };
}

export class TimetableEngine {
  private assignments: any[] = [];
  private timeSlots: TimeSlot[] = [];
  private rooms: Room[] = [];
  private roomMappings: any[] = [];
  
  // Tracking
  private teacherMatrix: Map<string, Set<string>> = new Map();
  private roomMatrix: Map<string, Set<string>> = new Map();
  private divisionMatrix: Map<string, Set<string>> = new Map();
  private batchMatrix: Map<string, Set<string>> = new Map();
  private practicalCountMatrix: Map<string, number> = new Map();

  private generatedEntries: any[] = [];
  private config: EngineConfig;

  constructor(config: EngineConfig = { days: [1, 2, 3, 4, 5], variantsToGenerate: 1 }) {
    this.config = config;
  }

  public async generate() {
    console.log(`[Engine] Starting generation of ${this.config.variantsToGenerate} variants...`);
    
    let whereClause: any = {};
    if (this.config.scope && this.config.scope.divisionIds.length > 0) {
      whereClause = {
        OR: [
          { type: 'LECTURE', divisionId: { in: this.config.scope.divisionIds } },
          { type: { in: ['PRACTICAL', 'TUTORIAL', 'SEMINAR'] }, batchId: { in: this.config.scope.batchIds } }
        ]
      };
    }

    this.assignments = await prisma.facultyAssignment.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { teacher: true, subject: true, division: true, batch: true }
    });
    this.timeSlots = await prisma.timeSlot.findMany({ orderBy: { index: 'asc' } });
    this.rooms = await prisma.room.findMany();
    this.roomMappings = await prisma.roomMapping.findMany({ include: { room: true } });

    // Generate N variants and pick the best one
    let bestScore = -99999;
    let bestEntries: any[] = [];

    for (let v = 1; v <= this.config.variantsToGenerate; v++) {
      this.resetTracking();
      const successCount = this.generateVariant(v);
      const score = this.calculateScore();
      
      console.log(`[Engine] Variant ${v} completed. Assigned: ${successCount} hours. Score: ${score}`);

      // We only save the one with the highest score that schedules everything (or most things)
      if (score > bestScore) {
        bestScore = score;
        bestEntries = [...this.generatedEntries];
      }
    }

    if (bestEntries.length > 0) {
      const timetable = await prisma.timetable.create({
        data: {
          name: `Generated (Score: ${bestScore})`,
          isGenerated: true,
          isValid: true,
          academicYear: '2026-27',
          semester: 5
        }
      });

      for (const entry of bestEntries) {
        await prisma.timetableEntry.create({
          data: {
            timetableId: timetable.id,
            dayOfWeek: entry.day,
            slotIndex: entry.slot.index,
            startTime: entry.slot.startTime,
            endTime: entry.slot.endTime,
            subjectId: entry.assignment.subjectId,
            teacherId: entry.assignment.teacherId,
            roomId: entry.roomId,
            divisionId: entry.assignment.divisionId,
            batchId: entry.assignment.batchId || null,
            type: entry.assignment.type
          }
        });
      }
      console.log(`[Engine] Best variant saved with ${bestEntries.length} entries.`);
      return timetable;
    }
    
    return null;
  }

  private resetTracking() {
    this.teacherMatrix.clear();
    this.roomMatrix.clear();
    this.divisionMatrix.clear();
    this.batchMatrix.clear();
    this.practicalCountMatrix.clear();
    this.generatedEntries = [];
  }

  private generateVariant(variantSeed: number): number {
    // Randomize slightly or use variantSeed to change priority
    const practicals = this.assignments.filter(a => ['PRACTICAL', 'TUTORIAL', 'SEMINAR'].includes(a.type));
    const theories = this.assignments.filter(a => a.type === 'LECTURE');

    // Shuffle arrays slightly based on seed to explore different search spaces
    if (variantSeed > 1) {
       practicals.sort(() => Math.random() - 0.5);
       theories.sort(() => Math.random() - 0.5);
    } else {
       // Deterministic order for Variant 1 (longest hours first)
       practicals.sort((a, b) => b.weeklyHours - a.weeklyHours);
       theories.sort((a, b) => b.weeklyHours - a.weeklyHours);
    }

    let hoursScheduled = 0;

    // 1. Schedule Practicals First (They need consecutive slots)
    for (const p of practicals) {
      let pScheduled = 0;
      while (pScheduled < p.weeklyHours) {
        const slotsNeeded = p.weeklyHours === 4 ? 2 : (p.weeklyHours >= 2 ? 2 : 1);
        const success = this.schedulePracticalBlock(p, slotsNeeded, variantSeed);
        if (success) pScheduled += slotsNeeded;
        else break;
      }
      hoursScheduled += pScheduled;
    }

    // 2. Schedule Theories
    for (const t of theories) {
      let tScheduled = 0;
      while (tScheduled < t.weeklyHours) {
        const success = this.scheduleTheoryBlock(t, variantSeed);
        if (success) tScheduled += 1;
        else break;
      }
      hoursScheduled += tScheduled;
    }

    return hoursScheduled;
  }

  private schedulePracticalBlock(assignment: any, consecutiveSlotsNeeded: number, variant: number): boolean {
    const blocks = this.getPracticalBlocks(variant, consecutiveSlotsNeeded);
    const validRooms = this.roomMappings
      .filter(rm => rm.type === 'PRACTICAL' && rm.subjectId === assignment.subjectId && rm.batchId === assignment.batchId)
      .map(rm => rm.room);

    for (const block of blocks) {
      // Validate all slots in the block
      let canSchedule = true;
      for (const slot of block.slots) {
        const key = `${block.day}-${slot.index}`;
        
        // 1. Max 2 Practical Divisions across college
        if ((this.practicalCountMatrix.get(key) || 0) >= 2) {
          canSchedule = false; break;
        }
        
        // 2. Batch / Division busy
        if (this.isBatchBusy(assignment.batchId, key)) { canSchedule = false; break; }
        if (this.isDivisionBusy(assignment.divisionId, key)) { canSchedule = false; break; }
        
        // 3. Teacher busy
        if (this.isTeacherBusy(assignment.teacherId, key)) { canSchedule = false; break; }
      }

      if (!canSchedule) continue;

      // Find an available Room valid for all slots in block
      let assignedRoom = null;
      for (const room of validRooms) {
        let roomFree = true;
        for (const slot of block.slots) {
          const key = `${block.day}-${slot.index}`;
          if (this.isRoomBusy(room.id, key)) { roomFree = false; break; }
        }
        if (roomFree) { assignedRoom = room; break; }
      }

      if (assignedRoom) {
        for (const slot of block.slots) {
          this.markBusy(assignment, assignedRoom.id, block.day, slot, true);
        }
        return true;
      }
    }
    return false;
  }

  private scheduleTheoryBlock(assignment: any, variant: number): boolean {
    const theorySlots = this.getTheorySlots(variant);
    const validRooms = this.roomMappings
      .filter(rm => rm.type === 'THEORY' && rm.divisionId === assignment.divisionId)
      .map(rm => rm.room);

    // Pass 1: Try strictly to balance subjects across days
    for (const { day, slot } of theorySlots) {
      const key = `${day}-${slot.index}`;

      if (this.isSubjectScheduledToday(assignment.subjectId, assignment.divisionId, day)) continue;
      if (this.isDivisionBusy(assignment.divisionId, key)) continue;
      if (this.isTeacherBusy(assignment.teacherId, key)) continue;

      let assignedRoom = null;
      for (const room of validRooms) {
        if (!this.isRoomBusy(room.id, key)) { assignedRoom = room; break; }
      }

      if (assignedRoom) {
        this.markBusy(assignment, assignedRoom.id, day, slot, false);
        return true;
      }
    }
    
    // Pass 2: Fallback (Ignore daily subject balance)
    for (const { day, slot } of theorySlots) {
      const key = `${day}-${slot.index}`;
      if (this.isDivisionBusy(assignment.divisionId, key)) continue;
      if (this.isTeacherBusy(assignment.teacherId, key)) continue;

      let assignedRoom = null;
      for (const room of validRooms) {
        if (!this.isRoomBusy(room.id, key)) { assignedRoom = room; break; }
      }

      if (assignedRoom) {
        this.markBusy(assignment, assignedRoom.id, day, slot, false);
        return true;
      }
    }
    return false;
  }

  // --- Helpers ---
  private calculateScore(): number {
    let score = 10000;
    // Score heavily based on successfully assigned hours
    const totalAssigned = this.generatedEntries.length;
    score += totalAssigned * 100;

    // Penalty for Division Gaps & Cross-Year Practical overlap (TE and BE balancing)
    const divSchedules: Record<string, Record<number, number[]>> = {};
    const practicalSlots: Record<string, string[]> = {}; // day-slot -> ['TE-A', 'BE-A']

    for (const e of this.generatedEntries) {
       if (!divSchedules[e.assignment.divisionId]) divSchedules[e.assignment.divisionId] = {};
       if (!divSchedules[e.assignment.divisionId][e.day]) divSchedules[e.assignment.divisionId][e.day] = [];
       divSchedules[e.assignment.divisionId][e.day].push(e.slot.index);

       if (['PRACTICAL', 'TUTORIAL'].includes(e.assignment.type)) {
           const key = `${e.day}-${e.slot.index}`;
           if (!practicalSlots[key]) practicalSlots[key] = [];
           const divName = e.assignment.division.name; // A or B
           const yearName = e.assignment.division.yearId; // We don't have year populated deeply, but we can infer from name if we fetched it
           // A simpler heuristic: just record divisionId and penalize if more than 1 practical is running
           if (!practicalSlots[key].includes(e.assignment.divisionId)) {
               practicalSlots[key].push(e.assignment.divisionId);
           }
       }
    }

    for (const key in practicalSlots) {
       // If more than 1 division is having practical at the exact same time, add a slight penalty to encourage staggering
       if (practicalSlots[key].length > 1) {
           score -= (practicalSlots[key].length * 20);
       }
    }

    for (const div in divSchedules) {
       for (const day in divSchedules[div]) {
          const slots = divSchedules[div][day].sort((a,b)=>a-b);
          for (let i = 1; i < slots.length; i++) {
             const diff = slots[i] - slots[i-1];
             if (diff > 1) { 
                let trueGap = diff - 1;
                if (slots[i-1] <= 2 && slots[i] >= 4) trueGap -= 1; // Short Recess
                if (slots[i-1] <= 5 && slots[i] >= 7) trueGap -= 1; // Lunch Break
                if (trueGap > 0) score -= (trueGap * 50);
             }
          }
       }
    }
    return score;
  }
  
  private isSubjectScheduledToday(subjectId: string, divisionId: string, day: number): boolean {
    return this.generatedEntries.some(e => 
      e.day === day && 
      e.assignment.subjectId === subjectId && 
      e.assignment.divisionId === divisionId && 
      e.assignment.type === 'LECTURE'
    );
  }

  private getTheorySlots(variant: number): {day: number, slot: TimeSlot}[] {
    const slots: {day: number, slot: TimeSlot}[] = [];
    for (const day of this.config.days) {
      for (const slot of this.timeSlots) {
        if (!slot.isBreak) slots.push({day, slot});
      }
    }
    if (variant > 1) slots.sort(() => Math.random() - 0.5);
    return slots;
  }

  private getPracticalBlocks(variant: number, slotsNeeded: number): {day: number, slots: TimeSlot[]}[] {
    const blocks: {day: number, slots: TimeSlot[]}[] = [];
    for (const day of this.config.days) {
      for (let i = 0; i <= this.timeSlots.length - slotsNeeded; i++) {
        if (slotsNeeded === 2) {
          const slot1 = this.timeSlots[i];
          const slot2 = this.timeSlots[i + 1];
          if (
            (slot1.index === 1 && slot2.index === 2) ||
            (slot1.index === 4 && slot2.index === 5) ||
            (slot1.index === 7 && slot2.index === 8)
          ) {
            blocks.push({day, slots: [slot1, slot2]});
          }
        } else {
            const slot1 = this.timeSlots[i];
            if (!slot1.isBreak) blocks.push({day, slots: [slot1]});
        }
      }
    }
    if (variant > 1) blocks.sort(() => Math.random() - 0.5);
    return blocks;
  }

  private isBatchBusy(batchId: string, key: string) { return this.batchMatrix.get(key)?.has(batchId) || false; }
  private isDivisionBusy(divId: string, key: string) { return this.divisionMatrix.get(key)?.has(divId) || false; }
  private isTeacherBusy(teacherId: string, key: string) { return this.teacherMatrix.get(key)?.has(teacherId) || false; }
  private isRoomBusy(roomId: string, key: string) { return this.roomMatrix.get(key)?.has(roomId) || false; }

  private markBusy(assignment: any, roomId: string, day: number, slot: TimeSlot, isPractical: boolean) {
    const key = `${day}-${slot.index}`;
    
    if (!this.teacherMatrix.has(key)) this.teacherMatrix.set(key, new Set());
    if (!this.roomMatrix.has(key)) this.roomMatrix.set(key, new Set());
    if (!this.divisionMatrix.has(key)) this.divisionMatrix.set(key, new Set());
    if (!this.batchMatrix.has(key)) this.batchMatrix.set(key, new Set());

    this.teacherMatrix.get(key)!.add(assignment.teacherId);
    this.roomMatrix.get(key)!.add(roomId);
    
    if (assignment.type === 'LECTURE') {
      this.divisionMatrix.get(key)!.add(assignment.divisionId);
    } else if (assignment.batchId) {
      this.batchMatrix.get(key)!.add(assignment.batchId);
      this.divisionMatrix.get(key)!.add(assignment.divisionId);
    }

    if (isPractical) {
      const currentDivs = new Set(Array.from(this.batchMatrix.get(key)!).map(bId => {
         return this.assignments.find(a => a.batchId === bId)?.divisionId;
      }));
      this.practicalCountMatrix.set(key, currentDivs.size);
    }

    this.generatedEntries.push({ assignment, roomId, day, slot });
  }
}
