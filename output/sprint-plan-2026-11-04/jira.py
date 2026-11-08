import sys,json,urllib.request,urllib.error
sys.path.insert(0,'/tmp')
from persona_jira_api import BASE,AUTH
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def api(path,method='GET',body=None):
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Authorization':AUTH,'Accept':'application/json','Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as r:
   raw=r.read();return json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:
  raise RuntimeError(f'Jira HTTP {e.code}: '+e.read().decode()[:1800]) from None
if __name__=='__main__':
 from urllib.parse import quote
 issues=[];token=None
 while True:
  path='/rest/api/3/search/jql?jql=project%3DAIN&maxResults=100&fields=summary,description,status,issuetype,parent,issuelinks,subtasks,labels,customfield_10016,customfield_10020,customfield_10019'
  if token:path+='&nextPageToken='+quote(token)
  page=api(path);issues+=page['issues']
  if page.get('isLast',True):break
  token=page['nextPageToken']
 boards=api('/rest/agile/1.0/board?projectKeyOrId=AIN&maxResults=100')
 result={'issues':issues,'boards':boards};(ROOT/'baseline.json').write_text(json.dumps(result,indent=2))
 print(json.dumps({'issues':len(issues),'boards':boards,'epics':[{'key':i['key'],'summary':i['fields']['summary'],'status':i['fields']['status']['name']} for i in issues if i['fields']['issuetype']['name']=='Epic']}))
