package in.navrakshak.idr;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Local-first worker roster and attendance store. Identity fields are synthetic in the demo. */
final class WorkforceDatabase extends SQLiteOpenHelper {
    WorkforceDatabase(Context c){super(c,"workforce.db",null,1);}
    public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE workers(id INTEGER PRIMARY KEY AUTOINCREMENT, worker_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT, id_hash TEXT NOT NULL, face_hash TEXT, project TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE attendance(id INTEGER PRIMARY KEY AUTOINCREMENT, worker_code TEXT NOT NULL, project TEXT NOT NULL, day TEXT NOT NULL, captured_at INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, accuracy REAL NOT NULL, evidence_hash TEXT, result TEXT NOT NULL, reason TEXT, UNIQUE(worker_code, project, day))");
    }
    public void onUpgrade(SQLiteDatabase db,int oldV,int newV){}
    long addWorker(String code,String name,String phone,String idHash,String faceHash,String project){ContentValues v=new ContentValues();v.put("worker_code",code.trim());v.put("name",name.trim());v.put("phone",phone);v.put("id_hash",idHash.trim());v.put("face_hash",faceHash);v.put("project",project.trim());v.put("created_at",System.currentTimeMillis());return getWritableDatabase().insertOrThrow("workers",null,v);}
    Cursor workers(){return getReadableDatabase().query("workers",null,null,null,null,null,"name ASC");}
    String workerName(String code){Cursor c=getReadableDatabase().query("workers",new String[]{"name","active","project"},"worker_code=?",new String[]{code},null,null,null);try{return c.moveToFirst()?c.getString(0)+"|"+c.getInt(1)+"|"+c.getString(2):null;}finally{c.close();}}
    String mark(String code,String project,double lat,double lon,float accuracy,String evidence){
        String w=workerName(code); if(w==null)return "REJECTED: worker is not on the roster"; String[] p=w.split("\\|",3); if(!"1".equals(p[1]))return "REJECTED: worker is inactive"; if(!p[2].equals(project))return "REJECTED: worker is not assigned to this project";
        String day=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date()); Cursor dup=getReadableDatabase().rawQuery("SELECT id FROM attendance WHERE worker_code=? AND project=? AND day=?",new String[]{code,project,day}); try{if(dup.moveToFirst())return "REJECTED: duplicate attendance for today";}finally{dup.close();}
        String result=accuracy<=50?"ACCEPTED":"FLAGGED"; String reason=accuracy<=50?"Roster, project, date and GPS checks passed":"GPS accuracy is above 50m; manual review required"; ContentValues v=new ContentValues();v.put("worker_code",code);v.put("project",project);v.put("day",day);v.put("captured_at",System.currentTimeMillis());v.put("lat",lat);v.put("lon",lon);v.put("accuracy",accuracy);v.put("evidence_hash",evidence);v.put("result",result);v.put("reason",reason);getWritableDatabase().insertOrThrow("attendance",null,v);return result+": "+reason;
    }
    Cursor attendance(String day){return getReadableDatabase().rawQuery("SELECT a.worker_code,w.name,a.project,a.captured_at,a.accuracy,a.result,a.reason FROM attendance a JOIN workers w ON w.worker_code=a.worker_code WHERE a.day=? ORDER BY a.captured_at DESC",new String[]{day});}
}
