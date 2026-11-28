const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const oldMobileNav = `      {/* Mobile Tab Scroller */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 gap-2 bg-[#E2D5C0] dark:bg-[#151B27] no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={\`text-[11px] whitespace-nowrap font-mono-tech px-2.5 py-1 border transition-colors \${
              activeSection === item.id 
                 ? 'bg-[#1A1A1A] dark:bg-[#FAF6EE] text-[#FAF6EE] dark:text-[#1A1A1A] font-bold border-transparent' 
                 : 'text-[#1A1A1A]/75 dark:text-[#FAF6EE]/75 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:bg-[#FAF6EE]/40 dark:hover:bg-[#1E2738]'
            }\`}
          >
            {item.label}
          </button>
        ))}
      </div>`;

const newMobileNav = `      {/* Mobile Tab Scroller */}
      <div className="lg:hidden overflow-x-auto px-4 py-1 border-t border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 bg-[#E2D5C0] dark:bg-[#151B27] no-scrollbar">
        <LimelightNav 
          items={limelightItems} 
          defaultActiveIndex={activeIndex}
          onTabChange={(index) => onNavigate(limelightItems[index].id as string)}
          className="bg-transparent border-none min-w-max"
          iconClassName="text-[#1A1A1A] dark:text-[#FAF6EE]"
          limelightClassName="bg-[#DC143C] dark:bg-[#E63956] shadow-[0_5px_15px_rgba(220,20,60,0.5)] dark:shadow-[0_5px_15px_rgba(230,57,86,0.5)] h-[3px]"
        />
      </div>`;

code = code.replace(oldMobileNav, newMobileNav);
fs.writeFileSync('src/components/Navbar.tsx', code);
