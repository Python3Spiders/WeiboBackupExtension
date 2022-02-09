
var max_page = 10000;
var can_change_max_page_flag = true
async function getData(url = '', cookie = '') {
    // Default options are marked with *
    console.log(url)
    const response = await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
            'referer': 'https://weibo.cn/u/1198392970',
            'cookie': cookie
        }
    });
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(response.text());
        }, 500);
    });
}

const getFilterData = async (cookies, user_id, page) => {
    var data = await getData('https://weibo.cn/u/' + user_id + '?page=' + page, cookies)
    console.log(data);
    $().parse(data);
    var info = $("div[class=c]")

    if (info.length == 1 && can_change_max_page_flag == true) {
        max_page = page + 1;
        can_change_max_page_flag = false
    }

    var is_exist = $("div[class=c]").eq(0).find("span[class=ctt]")
    console.log(info.length)
    console.log(is_exist.length)

    var weibo_arr = new Array()

    if (is_exist.length > 0) {
        for (var i = 0; i < info.length - 1; i++) {

            // console.log(i, info.length);

            var cur_weibo = $("div[class=c]").eq(i)

            var weibo_id = cur_weibo.attr('id').slice(2);
            var weibo_link = 'https://weibo.cn/' + user_id + '/' + weibo_id

            var publish_time = cur_weibo.find("span[class=ct]").text().split('来自')[0].replace("&nbsp;", "")

            // var content =      cur_weibo.find("span").text()
            var content = $("span[class=ctt]").eq(i).text()

            var like_cnt = 0
            var forward_cnt = 0
            var comment_cnt = 0

            $("div[class=c]").eq(i).find("a").each(function () {
                var cur_text = $(this).text();
                if (cur_text.indexOf("赞") > -1) {
                    like_cnt = cur_text.slice(cur_text.indexOf('[') + 1, -1)
                    if (like_cnt.length == 0) {
                        like_cnt = 0
                    }
                } else if (cur_text.indexOf("转发") > -1) {
                    forward_cnt = cur_text.slice(cur_text.indexOf('[') + 1, -1)
                    if (forward_cnt.length == 0) {
                        forward_cnt = 0
                    }
                } else if (cur_text.indexOf("评论") > -1) {
                    comment_cnt = cur_text.slice(cur_text.indexOf('[') + 1, -1)
                    if (comment_cnt.length == 0) {
                        comment_cnt = 0
                    }
                }
            })


            console.log(i, weibo_id, weibo_link, publish_time, content, like_cnt, forward_cnt, comment_cnt)

            weibo_arr.push([weibo_id, weibo_link, publish_time, content, like_cnt, forward_cnt, comment_cnt])
        }
    }
    var res = {
        'page': page,
        'data': weibo_arr
    }
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(res);
        }, 500);
    });
}

const doSpider = async (cookies, user_id) => {
    var res_data = [['微博 id', '微博链接', '发布时间', '内容', '点赞数', '转发数', '评论数']]
    var receive_page = 0;
    for (var page = 1; page < max_page; page++) {
        var a = await getFilterData(cookies, user_id, page)
        receive_page += 1
        for (var i = 0; i < a.data.length; i++) {
            res_data.push(a.data[i])
        }
        var save = document.getElementById('save');
        save.innerHTML = "已抓取 "+ res_data.length+ " 条微博，请勿关闭此弹窗和离开此页面"
        if (receive_page == max_page - 1 || receive_page % 20 == 0) {
            const wb = XLSX.utils.book_new()
            //  2、创建工作表 worksheet
            const ws = XLSX.utils.aoa_to_sheet(res_data)
            // 3、把工作表放到工作簿中 
            XLSX.utils.book_append_sheet(wb, ws, 'uid_' + user_id)
            // 4、生成数据保存
            var wopts = { bookType: 'xlsx', bookSST: false, type: 'binary' }
            XLSX.writeFile(wb, user_id + ".xlsx", wopts)

            var save = document.getElementById('save');
            save.innerHTML = "抓取结束，已保存"
            $("#save").attr('disabled',true);
        }
    }
}

const start_crawl = (user_id) => {
    console.log('start_crawl')
    // 获取指定网址的Cookie
    chrome.cookies.getAll({
        url: "https://weibo.cn/",
    }, function (result) {
        var res = result;
        var list = [];
        console.log(result)
        if (res.length) {
            // 对获取的结果进行处理
            for (var i = 0; i < res.length; i++) {
                var item = res[i].name + '=' + res[i].value;
                list.push(item);
            };
            var cookies = list.join(';');
            console.log(cookies);
            // 发起请求给后端

            // var user_id = '1198392970'
            // var max_page = 5
            doSpider(cookies, user_id)

        }
    })
}

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

async function auto_parse_uid() {
    var input = document.getElementById('user_id');
    var save = document.getElementById('save');

    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);

    var current_url = tab.url
    if (current_url == undefined) {
        return
    }
    var adding_user_id = ''
    if (current_url.indexOf("?") > -1) {
        current_url = current_url.slice(0, current_url.indexOf("?"))
    }
    if (current_url.lastIndexOf("/") > -1) {
        adding_user_id = current_url.slice(current_url.lastIndexOf("/") + 1)
        if (adding_user_id.length == 10 && /^\d+$/.test(adding_user_id)) {
            input.value = adding_user_id
            save.innerHTML = "自动解析 uid 成功，点击开始抓取"
        }
    }
    console.log(tab.url);

}

// clear_data()
auto_parse_uid()
// get_data()
// 点击保存，执行保存value
var save = document.getElementById("save");
save.addEventListener('click', save_data)

var user_id = '1198392970'

// 保存方法
function save_data() {
    var adding_user_id = document.getElementById('user_id');
    if (adding_user_id.value.length == 10 && /^\d+$/.test(adding_user_id.value)) {
        alert('准备开始抓取，速度为 10条/秒，每 200 条保存一次，结束自动保存')
        var save = document.getElementById('save');
        save.innerHTML = "正在抓取中，请勿关闭此弹窗和离开此页面"
        $("#save").attr('disabled',false);
        start_crawl(adding_user_id.value)
    } else {
        alert("添加的微博数字 uid 不合法")
    }
}
// start_crawl(user_id)


