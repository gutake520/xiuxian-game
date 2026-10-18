import {QI_PEAKS,FOUNDATION_PEAKS} from './locations.js';
export const TREASURE_FIND_CHANCE=.05;
export const TREASURE_REAL_CHANCE=.3;
// Add a new realm here only when its monster locations and reward are available.
export const TREASURE_TIERS=[
 {realm:'炼气',reward:10,peaks:QI_PEAKS.filter(p=>p.kind==='monster')},
 {realm:'筑基',reward:15,peaks:FOUNDATION_PEAKS.filter(p=>p.kind==='monster')}
];
export const TREASURE_GAMES={
 real:{durationMs:18000,intervalMs:1200,visibleMs:1050,target:8},
 fake:{durationMs:18000,intervalMs:500,visibleMs:280,target:24}
};
