import type {GuestSnapshot} from '../../src/guest/session';
/** Kolm küttu idast läände reas (K1 läänes), ajaja eraldi; aju ala on liini põhjapoolsel küljel. */
export const snapshot:GuestSnapshot={
 hunt:{title:'Laupäevane jaht',status:'active'},
 drive:{sequence:1,title:'Aju 1',status:'active',area:{type:'Polygon',coordinates:[[[24.899,58.601],[24.903,58.601],[24.903,58.604],[24.899,58.604],[24.899,58.601]]]}},
 positions:[
  {id:'p1',number:1,coordinates:[24.900,58.600],role:'hunter',name:'Mari M.'},
  {id:'p2',number:2,coordinates:[24.901,58.600],role:'hunter',name:'Jaan T.'},
  {id:'p3',number:3,coordinates:[24.902,58.600],role:'hunter',name:'Peeter K.'},
  {id:'p4',number:4,coordinates:[24.900,58.605],role:'dog_driver',name:'Toomas R.'}
 ],
 expires_at:new Date(Date.now()+3600e3).toISOString(),generated_at:new Date().toISOString()
};
