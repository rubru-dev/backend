export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "sm" ? 0.7 : size === "lg" ? 1.3 : 1;
  const w = Math.round(32 * scale);
  const h = Math.round(32 * scale);
  const textSm = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm";
  const textLg = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* House shape */}
        <path d="M16 3L3 13V29H13V20H19V29H29V13L16 3Z" fill="#F97316" opacity="0.15"/>
        <path d="M16 3L3 13V29H13V20H19V29H29V13L16 3Z" fill="none" stroke="#F97316" strokeWidth="2" strokeLinejoin="round"/>
        {/* Arrow/refresh inside */}
        <path d="M12 16C12 13.8 13.8 12 16 12C17.5 12 18.8 12.8 19.5 14" stroke="#0F4C75" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 16C20 18.2 18.2 20 16 20C14.5 20 13.2 19.2 12.5 18" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M19 12.5L19.5 14L21 13.5" stroke="#0F4C75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 19.5L12.5 18L11 18.5" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="flex flex-col leading-tight">
        <span className={`${textSm} font-bold text-orange-500 leading-none`}>Rubah</span>
        <span className={`${textLg} font-extrabold text-[#0F4C75] leading-none`}>Rumah</span>
      </div>
    </div>
  );
}
