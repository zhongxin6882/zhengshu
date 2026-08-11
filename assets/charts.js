(function() {
  var style = getComputedStyle(document.documentElement);
  var primary = style.getPropertyValue('--primary').trim();
  var primaryHover = style.getPropertyValue('--primary-hover').trim();
  var success = style.getPropertyValue('--success').trim();
  var warning = style.getPropertyValue('--warning').trim();
  var error = style.getPropertyValue('--error').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var inkSecondary = style.getPropertyValue('--ink-secondary').trim();
  var inkTertiary = style.getPropertyValue('--ink-tertiary').trim();
  var rule = style.getPropertyValue('--border').trim();
  var bg2 = style.getPropertyValue('--bg-container').trim();
  var bgLayout = style.getPropertyValue('--bg-layout').trim();
  var muted = style.getPropertyValue('--ink-disabled').trim();

  var chartInstances = {};

  // Helper: init chart
  function initChart(id, opts) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (chartInstances[id]) chartInstances[id].dispose();
    var chart = echarts.init(el, null, { renderer: 'svg' });
    if (opts) chart.setOption(opts);
    chartInstances[id] = chart;
    return chart;
  }

  // ===== NAVIGATION =====
  var navItems = document.querySelectorAll('.nav-item');
  var views = document.querySelectorAll('.view');
  var breadcrumb = document.getElementById('breadcrumb');
  var viewNames = {
    'overview': '概览',
    'dept-audit': '部证稽核',
    'ledger': '持证台账',
    'plug-stats': '插拔统计',
    'app-access': '应用访问'
  };

  navItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var view = this.getAttribute('data-view');
      switchView(view);
    });
  });

  window.switchView = function(view) {
    navItems.forEach(function(n) { n.classList.remove('active'); });
    views.forEach(function(v) { v.classList.remove('active'); });
    var targetNav = document.querySelector('.nav-item[data-view="' + view + '"]');
    if (targetNav) targetNav.classList.add('active');
    var targetView = document.getElementById('view-' + view);
    if (targetView) targetView.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = viewNames[view] || view;

    // Resize charts when switching views
    setTimeout(function() {
      Object.keys(chartInstances).forEach(function(k) {
        if (chartInstances[k] && !chartInstances[k].isDisposed()) {
          chartInstances[k].resize();
        }
      });
    }, 100);
  };

  // ===== TIME RANGE BUTTONS =====
  document.querySelectorAll('.time-range-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var container = this.parentElement;
      container.querySelectorAll('.time-range-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var range = this.getAttribute('data-range');
      var inputs = container.querySelectorAll('.time-range-input');
      if (range === 'custom') {
        inputs.forEach(function(i) { i.disabled = false; });
      } else {
        inputs.forEach(function(i) { i.disabled = true; });
        var now = new Date();
        var start = new Date();
        if (range === '3d') start.setDate(now.getDate() - 3);
        else if (range === '1w') start.setDate(now.getDate() - 7);
        else if (range === '1m') start.setMonth(now.getMonth() - 1);
        if (inputs[0]) inputs[0].value = formatDate(start);
        if (inputs[1]) inputs[1].value = formatDate(now);
      }
    });
  });

  function formatDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ===== DRILL-DOWN MODAL =====
  window.openDrillModal = function(title, type) {
    document.getElementById('drillModalTitle').textContent = title;
    var filtersEl = document.getElementById('drillFilters');
    var thead = document.getElementById('drillTableHead');
    var tbody = document.getElementById('drillTableBody');

    // Set filters
    var filterHtml = '';
    if (type === 'personnel' || type === 'certificate') {
      filterHtml = '<div class="filter-item"><span class="filter-label">部门</span><select class="filter-select"><option>请选择内容</option></select></div>' +
        '<div class="filter-item"><span class="filter-label">用户姓名</span><input type="text" class="filter-input" placeholder="请输入姓名、拼音、首字母、检索" style="width:200px;"></div>' +
        '<div class="filter-item"><span class="filter-label">警种</span><select class="filter-select"><option>请选择内容</option></select></div>' +
        '<div class="filter-item"><span class="filter-label">性别</span><select class="filter-select" style="min-width:80px;"><option>请选择内容</option></select></div>' +
        '<button class="btn">重置</button><button class="btn btn-primary">查询</button>';
    }
    filtersEl.innerHTML = filterHtml;

    // Set table headers
    if (type === 'personnel') {
      thead.innerHTML = '<tr><th>ID</th><th>姓名</th><th>岗位</th><th>所属单位</th><th>警种</th><th>证书序列号</th><th>性别</th><th>年龄</th><th>手机号码</th><th>是否退休</th><th>身份证号</th><th>操作</th></tr>';
      tbody.innerHTML = generatePersonnelRows();
    } else if (type === 'certificate') {
      thead.innerHTML = '<tr><th>序号</th><th>所属部门</th><th>证书序列号</th><th>证书状态</th><th>数字证书发放时间</th><th>最后登录应用时间</th><th>最后登录应用名称</th><th>最后登录应用机器IP</th></tr>';
      tbody.innerHTML = generateCertRows();
    } else if (type === 'app-access-log') {
      thead.innerHTML = '<tr><th>用户姓名</th><th>所属部门</th><th>登录次数</th><th>应用名称</th></tr>';
      tbody.innerHTML = generateAccessLogRows();
    } else if (type === 'plug-log') {
      thead.innerHTML = '<tr><th>用户姓名</th><th>所属部门</th><th>插拔电脑次数</th><th>IP地址</th></tr>';
      tbody.innerHTML = generatePlugLogRows();
    } else if (type === 'risk-event') {
      thead.innerHTML = '<tr><th>时间范围</th><th>IP地址</th><th>事件名称</th><th>事件描述</th><th>事件次数</th><th>危险级别</th><th>事件主体</th><th>证书序列号</th><th>所属部门</th></tr>';
      tbody.innerHTML = generateRiskRows();
    }

    document.getElementById('drillModal').classList.add('show');
  };

  window.closeDrillModal = function() {
    document.getElementById('drillModal').classList.remove('show');
  };

  document.getElementById('drillModal').addEventListener('click', function(e) {
    if (e.target === this) closeDrillModal();
  });

  // ===== PERSON DRAWER =====
  window.openPersonDrawer = function(name) {
    var body = document.getElementById('drawerBody');
    body.innerHTML = getPersonDetailHTML(name);
    document.getElementById('drawerOverlay').classList.add('show');
    document.getElementById('personDrawer').classList.add('show');
  };

  window.closeDrawer = function() {
    document.getElementById('drawerOverlay').classList.remove('show');
    document.getElementById('personDrawer').classList.remove('show');
  };

  function getPersonDetailHTML(name) {
    return '<div class="person-header">' +
      '<div class="person-avatar">' + (name || '关') + '</div>' +
      '<div class="person-info">' +
      '<div><span class="info-label">姓名：</span><span class="info-value">' + (name || '关才若') + '</span></div>' +
      '<div><span class="info-label">身份证号：</span><span class="info-value">13024******646666</span></div>' +
      '<div><span class="info-label">所属部门：</span><span class="info-value">市局直属科信处</span></div>' +
      '<div><span class="info-label">警种：</span><span class="info-value">科信</span></div>' +
      '<div><span class="info-label">岗位：</span><span class="info-value">科员</span></div>' +
      '<div><span class="info-label">电话号码：</span><span class="info-value">15932451234</span></div>' +
      '<div><span class="info-label">性别：</span><span class="info-value">男</span></div>' +
      '<div><span class="info-label">年龄：</span><span class="info-value">35</span></div>' +
      '<div><span class="info-label">是否兼职：</span><span class="info-value">否</span></div>' +
      '<div><span class="info-label">是否退休：</span><span class="info-value">否</span></div>' +
      '</div></div>' +

      '<div class="section-title">风险统计</div>' +
      '<div class="risk-cards" style="margin-bottom:24px;">' +
      '<div class="risk-card"><div class="risk-info"><div class="risk-icon danger">!</div><div><div class="risk-name">PKI证书长时间未使用</div><div class="risk-desc">近一个月</div></div></div><div class="risk-count" style="color:var(--error);">28</div></div>' +
      '<div class="risk-card"><div class="risk-info"><div class="risk-icon warning">!</div><div><div class="risk-name">证书弱口令</div><div class="risk-desc">近一个月</div></div></div><div class="risk-count" style="color:var(--warning);">12</div></div>' +
      '<div class="risk-card"><div class="risk-info"><div class="risk-icon info">!</div><div><div class="risk-name">疑似共用证书</div><div class="risk-desc">近一个月</div></div></div><div class="risk-count" style="color:var(--primary);">5</div></div>' +
      '</div>' +

      '<div class="section-title">名下证书明细（3）</div>' +
      '<div class="table-wrap"><table><thead><tr><th>序号</th><th>所属部门</th><th>证书序列号</th><th>证书状态</th><th>数字证书发放时间</th><th>最后登录应用时间</th><th>最后登录应用名称</th><th>最后登录应用机器IP</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>市局直属科信处</td><td>YTU67560363</td><td><span class="tag tag-green">在线</span> <span class="tag tag-blue">使用中</span></td><td>2024/09/06 11:22:33</td><td>2024/09/06 11:22:33</td><td>贵州省厅-出入境管理</td><td>192.19.52.12</td></tr>' +
      '<tr><td>2</td><td>市局直属科信处</td><td>YTU67560363</td><td><span class="tag tag-green">在线</span> <span class="tag tag-blue">使用中</span></td><td>2024/09/06 11:22:33</td><td>2024/09/06 11:22:33</td><td>贵州省厅-出入境管理</td><td>192.19.52.12</td></tr>' +
      '<tr><td>3</td><td>市局直属科信处</td><td>YTU67560363</td><td><span class="tag tag-gray">离线</span> <span class="tag tag-blue">使用中</span></td><td>2024/09/06 11:22:33</td><td>2024/09/06 11:22:33</td><td>贵州省厅-出入境管理</td><td>192.19.52.12</td></tr>' +
      '</tbody></table></div>' +

      '<div class="section-title" style="margin-top:24px;">证书应用访问/插拔趋势</div>' +
      '<div style="display:flex;gap:32px;margin-bottom:16px;">' +
      '<div><span style="color:var(--ink-secondary);">证书应用访问同部门中排名</span><div style="font-size:30px;font-weight:600;color:var(--primary);">23</div></div>' +
      '<div><span style="color:var(--ink-secondary);">插拔证书同部门中排名</span><div style="font-size:30px;font-weight:600;color:var(--primary);">23</div></div>' +
      '<div><span style="color:var(--ink-secondary);">证书应用访问</span><div style="font-size:30px;font-weight:600;">1,000</div></div>' +
      '<div><span style="color:var(--ink-secondary);">插拔证书次数</span><div style="font-size:30px;font-weight:600;">1,000</div></div>' +
      '</div>' +
      '<div class="chart-container short" id="chart-person-trend" style="margin-bottom:24px;"></div>' +

      '<div class="section-title">证书应用访问/插拔明细</div>' +
      '<div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;">' +
      '<span style="color:var(--ink-secondary);">时间范围：</span><input type="date" class="time-range-input" value="2026-01-12"><span class="time-range-sep">至</span><input type="date" class="time-range-input" value="2026-01-19">' +
      '<label style="margin-left:16px;font-size:14px;"><input type="checkbox" checked> 全选</label>' +
      '<label style="font-size:14px;"><input type="radio" name="detailType" checked> 证书应用访问</label>' +
      '<label style="font-size:14px;"><input type="radio" name="detailType"> 证书插拔电脑</label>' +
      '</div>' +
      '<div class="accordion">' +
      '<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)">2025年 02月 <span style="color:var(--ink-tertiary);">共 12 条</span></div><div class="accordion-body">' +
      '<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)">1号 <span style="color:var(--ink-tertiary);">4 条数据</span></div><div class="accordion-body">' +
      '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-title">应用访问</div><div class="timeline-desc">关才若，归属市局直属科信处，于 2024 年 09 月 06 日 11:22:33 访问【贵州省厅 - 出入境管理】相关业务系统。</div><div class="timeline-time">2025-02-19 23:12:12</div></div></div>' +
      '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-title">证书插拔</div><div class="timeline-desc">关才若，于 2024 年 09 月 06 日 11:22:33 登录系统，并在 2024 年 09 月 06 日 12:22:33 退出登录。本次操作 IP 地址为 192.168.52.12，IP 归属贵州省科信处。</div><div class="timeline-time">2025-02-18 23:12:12</div></div></div>' +
      '</div></div>' +
      '</div></div></div>';
  }

  window.toggleAccordion = function(header) {
    var body = header.nextElementSibling;
    body.classList.toggle('show');
  };

  // ===== TAB SWITCHING =====
  document.querySelectorAll('.tab-item').forEach(function(tab) {
    tab.addEventListener('click', function() {
      var parent = this.parentElement;
      parent.querySelectorAll('.tab-item').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      var tabId = this.getAttribute('data-tab');
      var container = parent.parentElement;
      container.querySelectorAll('.tab-content').forEach(function(tc) { tc.style.display = 'none'; });
      var target = document.getElementById('tab-' + tabId);
      if (target) target.style.display = 'block';
    });
  });

  // ===== ROW GENERATORS =====
  function generatePersonnelRows() {
    var rows = '';
    var data = [
      ['hj888833344', '宗芸', '民警', '市局直属科信处', '武警', 'YTU67560363', '男', '23', '13867560363', '否', '130322*****232234'],
      ['hj888833344', '全怡杰', '民警', '市局直属科信处', '武警', 'YTU67560363，YTU67560363…', '男', '23', '13867560363', '否', '130322*****232234'],
      ['hj888833344', '但彬春', '民警', '市局直属科信处', '武警', 'YTU67560363', '男', '23', '13867560363', '否', '130322*****232234'],
      ['hj888833344', '娜苑青', '民警', '市局直属科信处', '武警', 'YTU67560363，YTU67560363…', '男', '23', '13867560363', '否', '130322*****232234'],
      ['hj888833344', '冉彬', '民警', '市局直属科信处', '网安', 'YTU67560363', '男', '23', '13867560363', '否', '13024******646666'],
      ['hj888833344', '其奇', '民警', '市局直属科信处', '网安', 'YTU67560363，YTU67560363…', '男', '23', '176957131264', '否', '13024******646666'],
    ];
    data.forEach(function(row) {
      rows += '<tr>';
      row.forEach(function(cell, i) {
        if (i === 1) {
          rows += '<td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + cell + '\')">' + cell + '</a></td>';
        } else if (i === row.length - 1) {
          rows += '<td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + row[1] + '\')">查看详情</a></td>';
        } else {
          rows += '<td>' + cell + '</td>';
        }
      });
      rows += '</tr>';
    });
    return rows;
  }

  function generateCertRows() {
    var rows = '';
    var data = [
      ['1', '市局直属科信处', 'YTU67560363', '在线', '使用中', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['2', '市局直属科信处', 'YTU67560363', '离线', '使用中', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['3', '市局直属科信处', 'YTU67560363', '离线', '使用中', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['4', '市局直属科信处', 'YTU67560363', '在线', '使用中', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['5', '市局直属科信处', 'YTU67560363', '离线', '冻结', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
    ];
    data.forEach(function(row) {
      rows += '<tr><td>' + row[0] + '</td>';
      for (var i = 1; i < row.length; i++) {
        if (i === 3) {
          var onlineTag = row[3] === '在线' ? '<span class="tag tag-green">在线</span>' : '<span class="tag tag-gray">离线</span>';
          rows += '<td>' + onlineTag + '</td>';
        } else if (i === 4) {
          var statusTag = row[4] === '使用中' ? '<span class="tag tag-blue">使用中</span>' :
            row[4] === '冻结' ? '<span class="tag tag-orange">冻结</span>' :
            '<span class="tag tag-gray">注销</span>';
          rows += '<td>' + statusTag + '</td>';
        } else {
          rows += '<td>' + row[i] + '</td>';
        }
      }
      rows += '</tr>';
    });
    return rows;
  }

  function generateAccessLogRows() {
    var rows = '';
    var data = [
      ['续国蓉', '市局直属科信处', '123', '出入境管理（34次），协同警务管理（34次），智能考勤（34次），安全管理平台（2次）…'],
      ['尉娴', '市局直属科信处', '73', '出入境管理（34次），协同警务管理（34次）'],
      ['续国蓉', '市局直属科信处', '123', '出入境管理（34次），协同警务管理（34次），智能考勤（34次），安全管理平台（2次）…'],
      ['尉娴', '市局直属科信处', '73', '出入境管理（34次），协同警务管理（34次）'],
    ];
    data.forEach(function(row) {
      rows += '<tr><td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + row[0] + '\')">' + row[0] + '</a></td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td></tr>';
    });
    return rows;
  }

  function generatePlugLogRows() {
    var rows = '';
    var data = [
      ['续国蓉', '市局直属科信处', '123', '192.19.52.12（34次），192.19.52.58（34次），192.19.52.72（34次），192.19.52.65（2次）…'],
      ['尉娴', '市局直属科信处', '73', '192.19.52.12（34次），192.19.52.58（34次）'],
      ['续国蓉', '市局直属科信处', '123', '192.19.52.12（34次），192.19.52.58（34次），192.19.52.72（34次），192.19.52.65（2次）…'],
      ['尉娴', '市局直属科信处', '73', '192.19.52.12（34次），192.19.52.58（34次）'],
    ];
    data.forEach(function(row) {
      rows += '<tr><td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + row[0] + '\')">' + row[0] + '</a></td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td></tr>';
    });
    return rows;
  }

  function generateRiskRows() {
    var rows = '';
    var data = [
      ['2024.05.11 ~ 2024.06.11', '23.89.169.49,23.89.135.100', '弱口令', '安全强度极低，无法保障账号安全…', '2', '超危', '130322*****232234', '张磊', 'YTU67560363', '局刑事侦查大队'],
      ['2024.05.11 ~ 2024.06.11', '23.89.169.49', '弱口令', '安全强度极低，无法保障账号安全…', '2', '低危', '130322*****232234', '张磊', 'YTU67560363', '局刑事侦查大队'],
    ];
    data.forEach(function(row) {
      rows += '<tr>';
      for (var i = 0; i < row.length; i++) {
        if (i === 5) {
          rows += '<td><span class="tag ' + (row[5] === '超危' ? 'tag-red' : 'tag-orange') + '">' + row[5] + '</span></td>';
        } else {
          rows += '<td>' + row[i] + '</td>';
        }
      }
      rows += '</tr>';
    });
    return rows;
  }

  // ===== POPULATE TABLES =====
  function populateTable(id, genFn) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = genFn();
  }

  // Populate all tables
  populateTable('dept-personnel-tbody', generatePersonnelRows);
  populateTable('dept-cert-tbody', function() {
    return generateCertRows().replace(/<td>1<\/td>/, '<td>1</td>').replace(/<td>2<\/td>/, '<td>2</td>').replace(/<td>3<\/td>/, '<td>3</td>');
  });
  populateTable('dept-access-log-tbody', function() {
    var rows = '';
    var data = [
      ['续国蓉', '市局直属科信处', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['尉娴', '市局直属科信处', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['续国蓉', '市局直属科信处', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '192.19.52.12'],
      ['尉娴', '市局直属科信处', '2024/09/06 11:22:33', '贵州省厅-出入境管理', '-'],
    ];
    data.forEach(function(row) {
      rows += '<tr><td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + row[0] + '\')">' + row[0] + '</a></td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td></tr>';
    });
    return rows;
  });
  populateTable('dept-plug-log-tbody', function() {
    var rows = '';
    var data = [
      ['续国蓉', '市局直属科信处', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '192.19.52.12', '才欣', '贵州省贵阳市荣县上海街893号'],
      ['尉娴', '市局直属科信处', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '192.19.52.12', '盘志秀', '贵州省贵阳市昌邑区牛顿胡同138号'],
      ['续国蓉', '市局直属科信处', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '192.19.52.12', '才欣', '贵州省贵阳市荣县上海街893号'],
      ['尉娴', '市局直属科信处', '2024/09/06 11:22:33', '2024/09/06 11:22:33', '192.19.52.12', '盘志秀', '贵州省贵阳市昌邑区牛顿胡同138号'],
    ];
    data.forEach(function(row) {
      rows += '<tr><td><a class="btn-link" href="javascript:void(0)" onclick="openPersonDrawer(\'' + row[0] + '\')">' + row[0] + '</a></td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td><td>' + row[5] + '</td><td>' + row[6] + '</td></tr>';
    });
    return rows;
  });
  populateTable('dept-risk-log-tbody', generateRiskRows);
  populateTable('ledger-tbody', generatePersonnelRows);
  populateTable('plug-stats-tbody', function() {
    return generatePlugLogRows().replace(/<td><a/g, '<td><a');
  });
  populateTable('app-access-tbody', function() {
    return generateAccessLogRows().replace(/<td><a/g, '<td><a');
  });

  // ===== TOP 10 LISTS =====
  function populateTop10(id, data) {
    var el = document.getElementById(id);
    if (!el) return;
    var html = '';
    data.forEach(function(item, i) {
      html += '<div class="top10-item">' +
        '<div class="top10-rank' + (i < 3 ? ' top3' : '') + '">' + (i + 1) + '</div>' +
        '<div class="top10-name">' + item.name + '</div>' +
        '<div class="top10-value">' + item.value + '</div>' +
        '</div>';
    });
    el.innerHTML = html;
  }

  var plugTop10 = [
    { name: '虎鹏（市局直属科信处）', value: '9,812 次' },
    { name: '王一问（市局直属科信处）', value: '9,812 次' },
    { name: '张泽楷（市局直属科信处）', value: '9,812 次' },
    { name: '吴磊（市局直属科信处）', value: '9,812 次' },
    { name: '张安（市局直属科信处）', value: '9,812 次' },
    { name: '朱天华（市局直属科信处）', value: '9,812 次' },
    { name: '康悦（市局直属科信处）', value: '9,812 次' },
    { name: '吴泽楷（市局直属科信处）', value: '9,812 次' },
    { name: '吴磊（市局直属科信处）', value: '9,812 次' },
    { name: '张安（市局直属科信处）', value: '9,812 次' },
  ];
  var accessTop10 = [
    { name: '虎鹏（市局直属科信处）', value: '9,812 次' },
    { name: '王一问（市局直属科信处）', value: '9,812 次' },
    { name: '张泽楷（市局直属科信处）', value: '9,812 次' },
    { name: '吴磊（市局直属科信处）', value: '9,812 次' },
    { name: '张安（市局直属科信处）', value: '9,812 次' },
    { name: '朱天华（市局直属科信处）', value: '9,812 次' },
    { name: '康悦（市局直属科信处）', value: '9,812 次' },
    { name: '吴泽楷（市局直属科信处）', value: '9,812 次' },
    { name: '吴磊（市局直属科信处）', value: '9,812 次' },
    { name: '张安（市局直属科信处）', value: '9,812 次' },
  ];
  populateTop10('top10-plug', plugTop10);
  populateTop10('top10-access', accessTop10);

  // ===== CHARTS =====
  // Chart 1: Police Unit Online Status
  var policeUnits = ['情指', '大数据', '图侦', '刑侦', '技侦', '经侦', '网安', '出入境', '海关', '交警', '协同'];
  var onlineRates = [78, 46, 28, 65, 98, 12, 12, 12, 56, 12, 46];
  var loginRates = [78, 46, 28, 65, 98, 12, 12, 12, 56, 12, 46];

  initChart('chart-police-online', {
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: {
      data: ['在线率', '登录率'],
      bottom: 0,
      textStyle: { color: inkSecondary, fontSize: 12 }
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: policeUnits,
      axisLabel: { color: inkSecondary, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', max: 100,
      axisLabel: { color: inkSecondary, fontSize: 12, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLine: { show: false }
    },
    series: [
      {
        name: '在线率', type: 'bar',
        data: onlineRates,
        itemStyle: { color: primary, borderRadius: [4, 4, 0, 0] },
        barWidth: 16,
        label: { show: true, position: 'top', color: inkSecondary, fontSize: 11, formatter: '{c}%' }
      },
      {
        name: '登录率', type: 'bar',
        data: loginRates,
        itemStyle: { color: success, borderRadius: [4, 4, 0, 0] },
        barWidth: 16,
        label: { show: true, position: 'top', color: inkSecondary, fontSize: 11, formatter: '{c}%' }
      }
    ]
  });

  // Chart 2: Risk Distribution Pie
  initChart('chart-risk-pie', {
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true, formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'vertical', right: 10, top: 'center',
      textStyle: { color: inkSecondary, fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: bg2, borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      labelLine: { show: false },
      color: [primary, warning, error, success, '#722ED1', '#13C2C2'],
      data: [
        { value: 132534, name: '疑似共用证书' },
        { value: 132534, name: '离退人员未注销' },
        { value: 132534, name: '低频使用' },
        { value: 132534, name: '证书弱口令' },
        { value: 132534, name: '证书长期插电脑' },
        { value: 132534, name: '其他' }
      ]
    }]
  });

  // Chart 3: Risk Trend Line
  var dates = ['01-14', '01-15', '01-16', '01-17', '01-18', '01-19', '01-20', '01-21', '01-22', '01-23', '01-24', '01-25'];

  initChart('chart-risk-trend', {
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: {
      data: ['疑似共用证书', '离退人员未注销', '低频使用', '证书弱口令', '证书长期插电脑', '其他'],
      bottom: 0,
      textStyle: { color: inkSecondary, fontSize: 11 }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: inkSecondary, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: inkSecondary, fontSize: 12 },
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLine: { show: false }
    },
    color: [primary, warning, error, success, '#722ED1', '#13C2C2'],
    series: [
      { name: '疑似共用证书', type: 'line', data: [320, 332, 301, 334, 390, 330, 320, 350, 340, 380, 360, 345], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '离退人员未注销', type: 'line', data: [220, 182, 191, 234, 290, 330, 310, 250, 280, 310, 300, 275], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '低频使用', type: 'line', data: [150, 232, 201, 154, 190, 230, 210, 180, 200, 220, 210, 195], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '证书弱口令', type: 'line', data: [100, 132, 101, 134, 90, 130, 110, 120, 115, 125, 120, 118], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '证书长期插电脑', type: 'line', data: [80, 92, 71, 84, 190, 130, 100, 90, 95, 105, 100, 98], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '其他', type: 'line', data: [50, 62, 41, 54, 90, 60, 55, 52, 58, 65, 60, 55], smooth: true, symbol: 'circle', symbolSize: 4 }
    ]
  });

  // Chart 4: Dept Access/Plug
  initChart('chart-dept-access-plug', {
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: {
      data: ['证书应用访问', '插拔证书次数'],
      bottom: 0,
      textStyle: { color: inkSecondary, fontSize: 12 }
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: inkSecondary, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: inkSecondary, fontSize: 12 },
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLine: { show: false }
    },
    series: [
      { name: '证书应用访问', type: 'bar', data: [1200, 1000, 1100, 950, 1050, 1150, 1080, 980, 1020, 1100, 1050, 1000], itemStyle: { color: primary, borderRadius: [4, 4, 0, 0] }, barWidth: 14 },
      { name: '插拔证书次数', type: 'bar', data: [1000, 750, 850, 500, 250, 0, 500, 750, 1000, 750, 500, 250], itemStyle: { color: success, borderRadius: [4, 4, 0, 0] }, barWidth: 14 }
    ]
  });

  // Chart 5: Dept Event Trend
  initChart('chart-dept-event-trend', {
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: {
      data: ['疑似共用证书', '离退人员未注销', '低频使用', '证书弱口令', '证书长期插电脑', '其他'],
      bottom: 0,
      textStyle: { color: inkSecondary, fontSize: 11 }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: inkSecondary, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: inkSecondary, fontSize: 12 },
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLine: { show: false }
    },
    color: [primary, warning, error, success, '#722ED1', '#13C2C2'],
    series: [
      { name: '疑似共用证书', type: 'line', data: [211, 356, 211, 356, 211, 356, 211, 356, 211, 356, 211, 356], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '离退人员未注销', type: 'line', data: [180, 200, 190, 210, 200, 220, 210, 230, 220, 240, 230, 250], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '低频使用', type: 'line', data: [150, 160, 155, 165, 160, 170, 165, 175, 170, 180, 175, 185], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '证书弱口令', type: 'line', data: [100, 110, 105, 115, 110, 120, 115, 125, 120, 130, 125, 135], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '证书长期插电脑', type: 'line', data: [80, 90, 85, 95, 90, 100, 95, 105, 100, 110, 105, 115], smooth: true, symbol: 'circle', symbolSize: 4 },
      { name: '其他', type: 'line', data: [50, 55, 52, 58, 55, 60, 58, 62, 60, 65, 62, 68], smooth: true, symbol: 'circle', symbolSize: 4 }
    ]
  });

  // ===== RESIZE LISTENER =====
  window.addEventListener('resize', function() {
    Object.keys(chartInstances).forEach(function(k) {
      if (chartInstances[k] && !chartInstances[k].isDisposed()) {
        chartInstances[k].resize();
      }
    });
  });

  // ===== INIT PERSON DRAWER CHART ON OPEN =====
  var origOpenDrawer = window.openPersonDrawer;
  window.openPersonDrawer = function(name) {
    origOpenDrawer(name);
    setTimeout(function() {
      initChart('chart-person-trend', {
        animation: false,
        tooltip: { trigger: 'axis', appendToBody: true },
        legend: {
          data: ['证书应用访问', '证书插拔电脑'],
          bottom: 0,
          textStyle: { color: inkSecondary, fontSize: 12 }
        },
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: {
          type: 'category',
          data: ['03-2', '03-3', '03-4', '03-5', '03-6', '03-7', '03-8', '03-9', '03-10', '03-11', '03-12', '03-13', '03-14', '03-15', '03-16', '03-17', '03-18', '03-19', '03-20'],
          axisLabel: { color: inkSecondary, fontSize: 10 },
          axisLine: { lineStyle: { color: rule } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: inkSecondary, fontSize: 12 },
          splitLine: { lineStyle: { color: '#F0F0F0' } },
          axisLine: { show: false }
        },
        series: [
          { name: '证书应用访问', type: 'line', data: [12, 7, 2, 500, 300, 200, 450, 350, 250, 400, 300, 500, 450, 350, 250, 400, 300, 500, 450], smooth: true, symbol: 'circle', symbolSize: 4, itemStyle: { color: primary } },
          { name: '证书插拔电脑', type: 'line', data: [8, 5, 1, 400, 250, 150, 350, 300, 200, 350, 250, 400, 350, 300, 200, 350, 250, 400, 350], smooth: true, symbol: 'circle', symbolSize: 4, itemStyle: { color: success } }
        ]
      });
    }, 200);
  };

})();