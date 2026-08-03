const fs = require('fs');
const path = require('path');

const dir = 'e:/SEP_Main/SEP490_G58_Sum26/frontend/src/pages/';

const files = {
  'VoyageListPage.jsx': 'hải trình',
  'VesselListPage.jsx': 'tàu',
  'SewageLogPage.jsx': 'bản ghi',
  'ReportListPage.jsx': 'báo cáo',
  'ReportDetailPage.jsx': 'dữ liệu',
  'MyVoyagesPage.jsx': 'hải trình',
  'EngineLogPage.jsx': 'bản ghi',
  'DeckLogPage.jsx': 'bản ghi',
  'CrewListPage.jsx': 'thủy thủ',
  'CargoTypePage.jsx': 'loại hàng hóa',
  'AttendancePage.jsx': 'thủy thủ'
};

for (const [file, name] of Object.entries(files)) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /pagination=\{\{.*?\}\}/gs;
  const newPagination = `pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => \`Hiển thị \${range[0]}-\${range[1]} trong số \${total} ${name}\`,
            }}`;
  
  let changed = false;
  
  if (content.match(regex)) {
    content = content.replace(regex, newPagination);
    changed = true;
  } else if (content.includes('<Table') && !content.includes('pagination={false}')) {
    // try to inject
    content = content.replace(/(<Table[^>]*?)(>)/, `$1\n            ${newPagination}\n          $2`);
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
