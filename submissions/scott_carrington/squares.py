

#Map function
def map(lst, funct):
	length = len(lst)						#Get length of passed in list
	if length > 0:
		newLst = []							#Create list
		newLst[:]= []						#Ensure new list is emptied properly
		x = 0								#Set X = 0, used for counter
		
		for x in range(length) :			#Loop to step through each element
			elem = funct(lst[x])
			newLstLen = len(newLst)
			newLst[newLstLen:1] = [elem]	#Add element to list
			x = x + 1
		return newLst	
	else:
		print ("\tThe list passed in is empty!\n\tTherefore there is nothing to copy/convert.\n" + 
				"\tTerminating program...")
		quit()
	

#Function to give/convert and element
def lstElement(element):
	#Convert from int to string (Uncomment next 2 lines, comment out or remove third line):
	#newElement = str(element)
	#return newElement
	return element


#This next 2 lines are for testing of functions. Create list, then call functions
#foo = [1,2,3,4,5]
#myList = map(foo, lstElement)

#One line, per instructions, to call map fucntion using list created by 
#range and an anonymous function (lambda). Lambda squares the element.
myList = map(range(1000), lambda i: i**2)	

#Print new list
print myList

