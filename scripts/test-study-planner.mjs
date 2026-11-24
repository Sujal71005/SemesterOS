import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const out=mkdtempSync(join(tmpdir(),'semesteros-study-planner-'))
execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'--target','ES2022','--module','ES2022','--moduleResolution','Bundler','--skipLibCheck','--outDir',out,'--rootDir','src','src/utils/studyPlannerValidation.ts','src/utils/studyPlannerDates.ts','src/utils/studyPlannerFiltering.ts','src/types/studyPlanner.ts','src/types/academics.ts'],{stdio:'inherit'})
for (const [file, replacements] of [
  ['studyPlannerDates.js', [["from './studyPlannerValidation'", "from './studyPlannerValidation.js'"]]],
  ['studyPlannerFiltering.js', [["from './studyPlannerValidation'", "from './studyPlannerValidation.js'"], ["from './studyPlannerDates'", "from './studyPlannerDates.js'"]]],
]) {
  const compiledPath = resolve(out, 'utils', file)
  let compiled = readFileSync(compiledPath, 'utf8')
  for (const [before, after] of replacements) compiled = compiled.replace(before, after)
  writeFileSync(compiledPath, compiled)
}
const val=await import(pathToFileURL(resolve(out,'utils/studyPlannerValidation.js')))
const dates=await import(pathToFileURL(resolve(out,'utils/studyPlannerDates.js')))
const filtering=await import(pathToFileURL(resolve(out,'utils/studyPlannerFiltering.js')))
const recurring={id:'r',user_id:'u',subject_id:null,title:'Weekly',description:'',session_category:'lecture',schedule_type:'recurring',day_of_week:0,session_date:null,start_time:'09:00',end_time:'10:00',created_at:'',updated_at:''}
const once={...recurring,id:'o',schedule_type:'one_time',day_of_week:null,session_date:'2026-11-25'}
test('title and description validation trims and bounds lengths',()=>{assert.equal(val.validateSessionTitle(' x '),'x');assert.throws(()=>val.validateSessionTitle(' '));assert.throws(()=>val.validateSessionTitle('x'.repeat(181)));assert.throws(()=>val.validateSessionDescription('x'.repeat(5001)))} )
test('category, schedule, weekday and time validation',()=>{assert.doesNotThrow(()=>val.validateSessionCategory('lecture'));assert.throws(()=>val.validateSessionCategory('bad'));assert.doesNotThrow(()=>val.validateScheduleType('recurring'));assert.throws(()=>val.validateScheduleType('bad'));for(let i=0;i<=6;i++)assert.doesNotThrow(()=>val.validateWeekday(i));assert.throws(()=>val.validateWeekday(7));assert.throws(()=>val.validateTimeRange('10:00','10:00'));assert.throws(()=>val.validateTimeRange('23:00','01:00'))})
test('recurring fields require weekday and no date',()=>{assert.doesNotThrow(()=>val.validateSessionFields(recurring));assert.throws(()=>val.validateSessionFields({...recurring,day_of_week:null}));assert.throws(()=>val.validateSessionFields({...recurring,session_date:'2026-11-25'}))})
test('weekday numbering is Sunday zero through Saturday six',()=>{assert.equal(new Date(2026,10,22,12).getDay(),0);assert.equal(new Date(2026,10,28,12).getDay(),6);val.validateOccurrenceDate(recurring,'2026-11-22')})
test('recurring occurrences use local dates across selected range',()=>{const rows=dates.calculateSessionOccurrences([recurring],'2026-11-22','2026-11-29');assert.deepEqual(rows.map(x=>x.occurrence_date),['2026-11-22','2026-11-29'])})
test('one-time occurrence only appears on its selected date',()=>{assert.equal(dates.calculateSessionOccurrences([once],'2026-11-24','2026-11-26').length,1);assert.equal(dates.calculateSessionOccurrences([once],'2026-11-20','2026-11-24').length,0)})
test('occurrences sort by local date then start time',()=>{const rows=dates.calculateSessionOccurrences([{...once,start_time:'11:00'},{...recurring,start_time:'08:00'}],'2026-11-22','2026-11-25');assert.deepEqual(rows.map(x=>`${x.occurrence_date} ${x.start_time}`),['2026-11-22 08:00','2026-11-25 11:00'])})
test('overlap detection finds same-date intersecting sessions',()=>{const rows=dates.calculateSessionOccurrences([recurring,{...recurring,id:'r2',start_time:'09:30',end_time:'10:30'}],'2026-11-22','2026-11-22');assert.equal(filtering.detectSessionOverlaps(rows).length,1)})
test('occurrence date must match parent session',()=>{assert.throws(()=>val.validateOccurrenceDate(recurring,'2026-11-23'));assert.throws(()=>val.validateOccurrenceDate(once,'2026-11-24'));assert.throws(()=>dates.parseLocalDate('2026-02-30'))})
test('log status and completed_at stay consistent',()=>{assert.equal(val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status:'completed',completed_at:'2026-11-22T10:00:00Z'}).status,'completed');for(const status of ['skipped','planned'])assert.equal(val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status}).completed_at,null);assert.throws(()=>val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status:'completed'}));assert.throws(()=>val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status:'skipped',completed_at:'2026-11-22T10:00:00Z'}))})
test('duplicate session occurrence logs are rejected by reusable guard',()=>{assert.throws(()=>filtering.assertUniqueOccurrenceLog([{session_id:'r',occurrence_date:'2026-11-22'}],recurring,'2026-11-22'))})
test('create log validation rejects a one-time occurrence outside session_date',()=>assert.throws(()=>val.validateOccurrenceDate(once,'2026-11-24'),/one-time session date/i))
test('create log validation rejects a recurring occurrence on the wrong weekday',()=>assert.throws(()=>val.validateOccurrenceDate(recurring,'2026-11-23'),/recurring weekday/i))
test('update log validation rejects a stored occurrence date no longer matching its parent',()=>assert.throws(()=>val.validateOccurrenceDate(recurring,'2026-11-23'),/recurring weekday/i))
test('valid recurring and one-time occurrence dates pass shared service validation',()=>{assert.doesNotThrow(()=>val.validateOccurrenceDate(recurring,'2026-11-22'));assert.doesNotThrow(()=>val.validateOccurrenceDate(once,'2026-11-25'))})
test('resulting log status and completed_at combinations reject inconsistency',()=>{assert.throws(()=>val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status:'completed',completed_at:null}),/completed_at/i);assert.throws(()=>val.validateSessionLog({session_id:'s',occurrence_date:'2026-11-22',status:'skipped',completed_at:'2026-11-22T10:00:00Z'}),/completed_at/i)})
process.on('exit',()=>rmSync(out,{recursive:true,force:true}))
