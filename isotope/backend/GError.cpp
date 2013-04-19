/*
	Copyright (C) 2006, Mike Gashler

	This library is free software; you can redistribute it and/or
	modify it under the terms of the GNU Lesser General Public
	License as published by the Free Software Foundation; either
	version 2.1 of the License, or (at your option) any later version.

	see http://www.gnu.org/copyleft/lesser.html
*/

#include "GError.h"
#include <stdarg.h>
#include <wchar.h>
#include <exception>
#include <signal.h>
#include <sys/stat.h>
#include <string.h>
#include <string>
#include <stdlib.h>
#include <iostream>
#include <sstream>

using std::exception;
using std::string;
using std::cerr;

namespace GClasses {

bool g_exceptionExpected = false;

void Ex::setMessage(std::string message)
{
	if(g_exceptionExpected)
		m_message = message;
	else
		m_message = message; // (This is a good place to put a breakpoint. All unexpected exceptions pass through here.)
}

const char* Ex::what() const throw()
{ 
	return m_message.c_str();
}



GExpectException::GExpectException()
{
	m_prev = g_exceptionExpected;
	g_exceptionExpected = true;
}

GExpectException::~GExpectException()
{
	g_exceptionExpected = m_prev;
}




std::string to_str(const std::vector<bool>& vv){
	std::deque<bool> v(vv.begin(), vv.end());
	return to_str(v.begin(), v.end(),"vector");
}

void TestEqual(char const*expected, char const*got, std::string desc){
  TestEqual(std::string(expected), std::string(got), desc);
}

void TestEqual(char const* expected, char* got, std::string desc){
  TestEqual(std::string(expected), std::string(got), desc);
}

void TestEqual(char* expected, char* got, std::string desc){
  TestEqual(std::string(expected), std::string(got), desc);
}

void TestContains(std::string expectedSubstring, std::string got,
                  std::string descr){
	using std::endl;
	if(got.find(expectedSubstring) == std::string::npos){
		std::cerr
			<< endl
			<< "Substring match failed: " << descr << endl
			<< endl
			<< "Expected substring: " << expectedSubstring << endl
			<< "Got               : " << got << endl
			;
		throw Ex("Substring match test failed: ", descr);
	}
}



#ifdef WINDOWS
void GAssertFailed()
{
	cerr << "Debug Assert Failed!\n";
	cerr.flush();
	__debugbreak();
}
#else
void GAssertFailed()
{
	cerr << "Debug Assert Failed!\n";
	cerr.flush();
	raise(SIGINT);
}

int _stricmp(const char* szA, const char* szB)
{
	while(*szA)
	{
		if((*szA | 32) < (*szB | 32))
			return -1;
		if((*szA | 32) > (*szB | 32))
			return 1;
		szA++;
		szB++;
	}
	if(*szB)
		return -1;
	return 0;
}

int _strnicmp(const char* szA, const char* szB, int len)
{
	int n;
	for(n = 0; n < len; n++)
	{
		if((*szA | 32) < (*szB | 32))
			return -1;
		if((*szA | 32) > (*szB | 32))
			return 1;
		szA++;
		szB++;
	}
	return 0;
}

long filelength(int filedes)
{
	struct stat s;
	if(fstat(filedes, &s) == -1)
		return 0;
	return s.st_size;
}
#endif


} // namespace GClasses

