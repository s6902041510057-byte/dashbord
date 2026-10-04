import Link from "next/link";
import { Sparkles, Users, Compass, Rocket } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-cosmic-violet/30 text-cosmic-cyan text-sm mb-8 shadow-starlight-violet animate-pulse">
        <Sparkles className="w-4 h-4 text-cosmic-cyan" />
        <span>Cosmic EdTech Quiz Platform v1.0</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-cosmic-cyan bg-clip-text text-transparent max-w-4xl">
        ภารกิจตอบคำถามพิชิตจักรวาล
      </h1>
      
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12">
        แพลตฟอร์มการแข่งขันตอบคำถามแบบกลุ่มในห้องเรียน สไตล์อวกาศสุดล้ำ พร้อมระบบสุ่มวงล้อ, โหวตหัวหน้ากลุ่ม และลุ้นคะแนนแบบ Real-time!
      </p>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl">
        {/* Teacher Portal */}
        <Link 
          href="/teacher" 
          className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col items-center text-center group border-cosmic-violet/20 hover:border-cosmic-cyan/50"
        >
          <div className="w-16 h-16 rounded-2xl bg-cosmic-violet/10 border border-cosmic-violet/30 flex items-center justify-center mb-4 text-cosmic-cyan group-hover:scale-110 transition-transform">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">สำหรับครูผู้สอน</h2>
          <p className="text-sm text-slate-400 mb-6">สร้างห้อง จัดการคำถาม ควบคุมการสุ่มกลุ่ม และคุมเกมการแข่งขัน</p>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cosmic-cyan">
            เข้าสู่ห้องควบคุมครู <Rocket className="w-4 h-4" />
          </span>
        </Link>

        {/* Student Portal */}
        <Link 
          href="/student" 
          className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col items-center text-center group border-cosmic-violet/20 hover:border-cosmic-violet/50"
        >
          <div className="w-16 h-16 rounded-2xl bg-cosmic-cyan/10 border border-cosmic-cyan/30 flex items-center justify-center mb-4 text-cosmic-violet group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">สำหรับนักเรียน</h2>
          <p className="text-sm text-slate-400 mb-6">กรอกรหัสห้อง เข้าสู่ลอบบี้ หมุนวงล้อสุ่มกลุ่ม และร่วมตอบคำถาม</p>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cosmic-violet">
            เข้าร่วมภารกิจ <Rocket className="w-4 h-4" />
          </span>
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-xs text-slate-500">
        Designed with Cosmic EdTech Spec • Powered by Next.js & Tailwind CSS
      </footer>
    </main>
  );
}
