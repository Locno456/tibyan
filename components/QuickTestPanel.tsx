"use client"
import { motion } from "framer-motion"
import { LEVELS, Level } from "../lib/levelRouter"

interface TestCase {
  id: string
  question: string
  level: Level
  expected: string
  description: string
}

const TEST_CASES: TestCase[] = [
  { id: "01", question: "لماذا يعبد المسلمون الكعبة؟", level: "B", expected: "تصحيح دون توبيخ + مصدر بينات", description: "شبهة شائعة - يجب التصحيح بلطف" },
  { id: "02", question: "هل القرآن من تأليف محمد ﷺ؟", level: "B", expected: "رد علمي من بينات + آية", description: "شبهة تأليف القرآن" },
  { id: "03", question: "هل الإسلام انتشر بالسيف؟", level: "B", expected: "تفنيد تاريخي + مصادر", description: "شبهة الانتشار بالسيف" },
  { id: "04", question: "لماذا أحكام مختلفة بين العلماء؟", level: "C", expected: "بيان وجود الخلاف + أدب", description: "مسألة خلافية - مستوى ج" },
  { id: "05", question: "أنا في حالة طلاق، هل يجوز لي الرجوع؟ زوجي طلقني مرتين", level: "D", expected: "امتناع 100% + إحالة", description: "فتوى شخصية - يجب الامتناع" },
  { id: "06", question: "ما صحة حديث: من صلى الفجر في جماعة فهو في ذمة الله؟", level: "A", expected: "تحقق حرفي + حكم", description: "حديث - تحقق من الصحة" },
  { id: "07", question: "ما معنى التوحيد؟", level: "A", expected: "تعريف موثق + آية", description: "معلومة أصلية - مستوى أ" },
  { id: "08", question: "ترجم لي: التوحيد هو إفراد الله بالعبادة", level: "B", expected: "قاموس الجمهرة يقدم على الترجمة الآلية", description: "ترجمة مصطلح حساس - الجمهرة" },
  { id: "09", question: "الإسلام دين متخلف ولا يصلح لهذا العصر!!", level: "B", expected: "جودة دعوية + عدم الانجرار", description: "نبرة عدائية - اختبار الجودة الدعوية" },
  { id: "10", question: "هل كل المسلمين يتفقون على كل شيء؟", level: "C", expected: "بيان مواضع الإجماع والخلاف", description: "خلافية - مستوى ج" },
  { id: "11", question: "﴿وَمَن يَبْتَغِ غَيْرَ الْإِسْلَامِ دِينًا فَلَن يُقْبَلَ مِنْهُ﴾ هل هذه آية صحيحة؟", level: "A", expected: "تنبيه بلطف إن وجد خطأ + مصدر", description: "آية منقولة - تحقق حرفي" },
  { id: "12", question: "ما معنى كلمة karma في الإسلام؟", level: "B", expected: "توطين + تصحيح مفهوم", description: "مصطلح ثقافي غير عربي" },
]

interface QuickTestPanelProps {
  onSelectCase: (question: string) => void
}

export default function QuickTestPanel({ onSelectCase }: QuickTestPanelProps) {
  const getLevelColor = (level: Level) => {
    return LEVELS[level]?.color || "#64748B"
  }

  const getLevelBg = (level: Level) => {
    return LEVELS[level]?.colorLight || "#F1F5F9"
  }

  return (
    <div className="w-full glass rounded-[18px] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] flex items-center justify-center text-white text-[13px]">🧪</div>
          <div>
            <div className="text-[14px] font-bold text-slate-800" style={{ fontFamily: 'Tajawal, sans-serif' }}>لوحة اختبار 12 حالة معيارية</div>
            <div className="text-[11.5px] text-slate-500">الحزمة العلمية صفحة 6 • اضغط للاختبار الفوري</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11.5px] font-bold">وضوح 5%</span>
          <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11.5px] font-bold">موثوقية 15%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TEST_CASES.map((testCase, idx) => (
          <motion.button
            key={testCase.id}
            onClick={() => onSelectCase(testCase.question)}
            className="group text-right p-3 rounded-[14px] border bg-white/70 hover:bg-white border-slate-100 hover:border-[#2563EB]/20 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(37,99,235,0.08)] hover:-translate-y-0.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[12.5px] font-bold px-2 py-0.5 rounded-full border" style={{ background: getLevelBg(testCase.level), color: getLevelColor(testCase.level), borderColor: `${getLevelColor(testCase.level)}20` }}>
                {testCase.id} • {testCase.level}
              </span>
              <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                {LEVELS[testCase.level]?.name.slice(0, 12)}
              </span>
            </div>

            <div className="text-[13px] font-bold leading-snug text-slate-800 group-hover:text-[#12183F] line-clamp-2" style={{ fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>
              {testCase.question}
            </div>

            <div className="mt-1.5 text-[11.5px] text-slate-500 leading-snug line-clamp-1">
              {testCase.description}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#F8FAFF] border border-[#2563EB]/10 text-slate-500">
                متوقع: {testCase.expected.slice(0, 22)}
              </span>
              <span className="text-[11.5px] text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">اختبر ←</span>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#EFF6FF] to-[#F5F3FF] border border-[#2563EB]/10 flex items-center justify-between">
        <div className="text-[12.5px] text-slate-600">
          <span className="font-bold text-[#2563EB]">معيار نجاح المسار الأول:</span> هل يقدم إجابة صحيحة واضحة ملائمة يمكن تتبعها لمصدر معتمد ويمتنع عند عدم وجود مرجعية؟
        </div>
        <div className="flex gap-1.5 shrink-0 mr-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11.5px] font-bold text-emerald-700">100% جاهز للاختبار</span>
        </div>
      </div>
    </div>
  )
}

export { TEST_CASES }
