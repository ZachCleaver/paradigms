// -------------------------------------------------------------
// The contents of this file may be distributed under the CC0
// license (http://creativecommons.org/publicdomain/zero/1.0/).
// -------------------------------------------------------------

#include <stdio.h>
#include <stdlib.h>
#ifdef WINDOWS
#	include <windows.h>
#	include <process.h>
#	include <direct.h>
#else
#	include <unistd.h>
#endif
#include "GDynamicPage.h"
#include "GDom.h"
#include "GHolders.h"
#include "GApp.h"
#include "GHttp.h"
#include "GTime.h"
#include "GFile.h"
#include "GRand.h"
#include <wchar.h>
#include <string>
#include <exception>
#include <iostream>
#include <sstream>
#include <map>
#include <vector>

using namespace GClasses;
using std::cout;
using std::cerr;
using std::string;
using std::ostream;
using std::map;
using std::vector;

class Guest
{
public:
	time_t m_timeLastCheckNews;
	double m_dx;
	double m_dz;
	double m_eta;
	string m_url;
	std::map<size_t,string> m_chats;
	std::map<size_t,string> m_urls;

	GDomNode* serialize(GDom* pDoc, size_t id)
	{
		GDomNode* pNode = pDoc->newObj();
		pNode->addField(pDoc, "id", pDoc->newInt(id));
		pNode->addField(pDoc, "dx", pDoc->newDouble(m_dx));
		pNode->addField(pDoc, "dz", pDoc->newDouble(m_dz));
		pNode->addField(pDoc, "eta", pDoc->newDouble(m_eta));
		pNode->addField(pDoc, "url", pDoc->newString(m_url.c_str()));
		return pNode;
	}

	void deserialize(GDomNode* pNode)
	{
		m_dx = pNode->field("dx")->asDouble();
		m_dz = pNode->field("dz")->asDouble();
		m_eta = pNode->field("eta")->asDouble();
		m_url = pNode->field("url")->asString();
	}
};




class Server : public GDynamicPageServer
{
protected:
	std::string m_basePath;
	std::map<size_t,Guest*> m_guests;
	time_t m_lastPurge;

public:
	Server(int port, GRand* pRand);
	virtual ~Server();
	virtual void handleRequest(const char* szUrl, const char* szParams, int nParamsLen, GDynamicPageSession* pSession, std::ostream& response);
	virtual void onEverySixHours() {}
	virtual void onStateChange() {}
	virtual void onShutDown() {}

	void fetch(const char* url, std::ostream& response);
	void sendNews(const char* szId, int len, std::ostream& response);
	void receiveScoop(const char* szScoop, int len, std::ostream& response);
};




Server::Server(int port, GRand* pRand) : GDynamicPageServer(port, pRand)
{
	char buf[300];
	GTime::asciiTime(buf, 256, false);
	cout << "Server starting at: " << buf << "\n";
	GApp::appPath(buf, 256, true);
	strcat(buf, "frontend/");
	GFile::condensePath(buf);
	m_basePath = buf;
	m_lastPurge = 0;
}

Server::~Server()
{
	flushSessions();
}

bool doesMatch(const char* a, const char* b)
{
	while(*a != '\0' && *b != '\0')
	{
		if(*a != *b)
			return false;
		a++;
		b++;
	}
	return true;
}

void Server::fetch(const char* url, std::ostream& response)
{
	if(doesMatch(myAddress(), url)) // todo: check for "localhost" and other variants
	{
		cout << "Fetching local url: " << (url + strlen(myAddress()) + 1) << "\n";
		sendFileSafe(m_basePath.c_str(), url + strlen(myAddress()) + 1, response);
	}
	else
	{
		cout << "Fetching url: " << url << "\n";
		GHttpClient client;
		size_t size;
		unsigned char* pFile = client.get(url, &size);
		ArrayHolder<unsigned char> hFile(pFile);
		if(size > 4194304)
			throw Ex("Tried to fetch a file that was more than 4MiB");
		response.write((char*)pFile, size);
	}
}

void Server::sendNews(const char* szId, int len, std::ostream& response)
{
#ifdef WINDOWS
	size_t requesterId = (size_t)_atoi64(szId);
#else
	size_t requesterId = strtoll(szId, (char**)NULL, 10);
#endif
	//cout << "Guest " << szId << " requested news\n";
	GDom doc;
	GDomNode* pObj = doc.newObj();
	doc.setRoot(pObj);
	time_t t;
	time(&t);
	pObj->addField(&doc, "time", doc.newInt(t));

	if(t - m_lastPurge > 6)
	{
		vector<size_t> dead_ids;
		for(std::map<size_t,Guest*>::iterator it = m_guests.begin(); it != m_guests.end(); it++)
		{
			Guest* pGuest = it->second;
			if(it->first == requesterId)
				pGuest->m_timeLastCheckNews = t;
			else if(t - pGuest->m_timeLastCheckNews >= 12)
				dead_ids.push_back(it->first);
		}
		for(std::vector<size_t>::iterator it = dead_ids.begin(); it != dead_ids.end(); it++)
			m_guests.erase(*it);
		m_lastPurge = t;
	}

	GDomNode* pStories = pObj->addField(&doc, "stories", doc.newList());
	for(std::map<size_t,Guest*>::iterator it = m_guests.begin(); it != m_guests.end(); it++)
	{
		Guest* pGuest = it->second;
		if(it->first == requesterId)
			pGuest->m_timeLastCheckNews = t;
		else
			pStories->addItem(&doc, pGuest->serialize(&doc, it->first));
	}

	doc.writeJson(response);
}

void Server::receiveScoop(const char* szScoop, int len, std::ostream& response)
{
	GDom doc;
	doc.parseJson(szScoop, len);
	GDomNode* pRoot = doc.root();
	size_t id = (size_t)pRoot->field("id")->asInt();
	Guest* pGuest;
	std::map<size_t,Guest*>::iterator it = m_guests.find(id);
	if(it == m_guests.end())
	{
		pGuest = new Guest();
		m_guests.insert(std::pair<size_t,Guest*>(id, pGuest));
	}
	else
		pGuest = it->second;
	pGuest->deserialize(pRoot);
	cout << "Guest " << to_str(id) << " sent a scoop\n";
//doc.writeJsonPretty(cout); cout << "\n"; cout.flush();
}

// virtual
void Server::handleRequest(const char* szUrl, const char* szParams, int nParamsLen, GDynamicPageSession* pSession, std::ostream& response)
{
	if(szUrl[0] != '/')
		szUrl = "/";
	if(strcmp(szUrl, "/") == 0)
		szUrl = "/entrance.html";
	else if(strncmp(szUrl, "/scoop", 6) == 0)
		receiveScoop(szParams, nParamsLen, response);
	else if(strncmp(szUrl, "/news", 5) == 0)
		sendNews(szParams, nParamsLen, response);
	else if(strncmp(szUrl, "/fetch", 6) == 0)
		fetch(szParams, response);
	else if(strcmp(szUrl, "/favicon.ico") == 0)
		return;
	else
	{
		cout << "Sending file: " << m_basePath.c_str() << (szUrl + 1) << "\n";
		sendFileSafe(m_basePath.c_str(), szUrl + 1, response);
	}
}

void getLocalStorageFolder(char* buf)
{
	if(!GFile::localStorageDirectory(buf))
		throw Ex("Failed to find local storage folder");
	strcat(buf, "/.isotope/");
	GFile::makeDir(buf);
	if(!GFile::doesDirExist(buf))
		throw Ex("Failed to create folder in storage area");
}

void LaunchBrowser(const char* szAddress)
{
	string s = szAddress;
	s += "/entrance.html?origin=";
	s += szAddress;
	s += "/Bill.js";
	if(!GApp::openUrlInBrowser(s.c_str()))
	{
		cout << "Failed to open the URL: " << s.c_str() << "\nPlease open this URL manually.\n";
		cout.flush();
	}
}

void doit(void* pArg)
{
	int port = 8988;
	unsigned int seed = getpid() * (unsigned int)time(NULL);
	GRand prng(seed);
	Server server(port, &prng);
	LaunchBrowser(server.myAddress());
	// Pump incoming HTTP requests (this is the main loop)
	server.go();
	cout << "Goodbye.\n";
}

void doItAsDaemon()
{
	char path[300];
	getLocalStorageFolder(path);
	string s1 = path;
	s1 += "stdout.log";
	string s2 = path;
	s2 += "stderr.log";
	GApp::launchDaemon(doit, path, s1.c_str(), s2.c_str());
	cout << "Daemon running.\n	stdout >> " << s1.c_str() << "\n	stderr >> " << s2.c_str() << "\n";
}

int main(int nArgs, char* pArgs[])
{
	int nRet = 1;
	try
	{
		if(nArgs > 1 && strcmp(pArgs[1], "daemon") == 0)
			doItAsDaemon();
		else
			doit(NULL);
	}
	catch(std::exception& e)
	{
		cerr << e.what() << "\n";
	}
	return nRet;
}
